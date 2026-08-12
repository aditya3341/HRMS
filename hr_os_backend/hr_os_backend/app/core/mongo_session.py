"""Small SQLAlchemy-model compatibility layer backed exclusively by MongoDB.

This keeps existing service code operational while routes are moved to native
Mongo repositories. It does not create or connect to any SQL database.
"""

from __future__ import annotations

import enum
import operator
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pymongo import ASCENDING, DESCENDING
from sqlalchemy.sql.elements import BindParameter, BooleanClauseList
from sqlalchemy.sql.schema import Column

from app.core.mongodb import get_mongo_db


def _collection_name(model: type) -> str:
    return getattr(model, "__tablename__", model.__name__.lower())


def _plain(value: Any) -> Any:
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, dict):
        return {key: _plain(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain(item) for item in value]
    return value


def _column_value(column: Any, row: Any) -> Any:
    key = getattr(column, "key", None) or getattr(column, "name", None)
    return getattr(row, key, None)


def _literal(value: Any, row: Any) -> Any:
    if isinstance(value, BindParameter):
        return value.value
    if hasattr(value, "class_") and hasattr(value, "key"):
        return _column_value(value, row)
    if isinstance(value, Column):
        return _column_value(value, row)
    return value


def _compare(left: Any, right: Any, op: Any) -> bool:
    left, right = _plain(left), _plain(right)
    name = getattr(op, "__name__", "")
    operations = {
        "eq": operator.eq,
        "ne": operator.ne,
        "lt": operator.lt,
        "le": operator.le,
        "gt": operator.gt,
        "ge": operator.ge,
        "is_": operator.is_,
        "is_not": operator.is_not,
    }
    if name in operations:
        return operations[name](left, right)
    if name in {"in_op", "in_"}:
        return left in [_plain(item) for item in right]
    if name in {"not_in_op", "notin_op"}:
        return left not in [_plain(item) for item in right]
    if name in {"like_op", "ilike_op"}:
        needle = str(right).replace("%", "")
        haystack = str(left or "")
        if name == "ilike_op":
            needle, haystack = needle.lower(), haystack.lower()
        return needle in haystack
    return bool(op(left, right))


def _matches(expression: Any, row: Any) -> bool:
    if expression is None:
        return True
    if isinstance(expression, BooleanClauseList):
        values = [_matches(clause, row) for clause in expression.clauses]
        return all(values) if expression.operator.__name__ == "and_" else any(values)
    if hasattr(expression, "left") and hasattr(expression, "right"):
        return _compare(
            _literal(expression.left, row),
            _literal(expression.right, row),
            expression.operator,
        )
    if hasattr(expression, "element"):
        return not _matches(expression.element, row)
    return bool(expression)


def _default_for(column: Column) -> Any:
    default = column.default
    if default is None:
        return None
    value = default.arg
    if callable(value):
        try:
            return value()
        except TypeError:
            return value(None)
    return value


def _to_document(instance: Any) -> dict[str, Any]:
    document: dict[str, Any] = {}
    for column in instance.__table__.columns:
        value = getattr(instance, column.key, None)
        if value is None:
            value = _default_for(column)
            if value is not None:
                setattr(instance, column.key, value)
        document[column.key] = _plain(value)

    identifier = document.get("id")
    if identifier is None:
        identifier = str(uuid.uuid4())
        document["id"] = identifier
        if "id" in instance.__table__.columns:
            try:
                setattr(instance, "id", uuid.UUID(identifier))
            except (TypeError, ValueError):
                setattr(instance, "id", identifier)
    document["_id"] = str(identifier)
    return document


def _restore(column: Column, value: Any) -> Any:
    if value is None:
        return None
    try:
        python_type = column.type.python_type
    except (AttributeError, NotImplementedError):
        return value
    try:
        if python_type is uuid.UUID and not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value))
        if python_type is date and isinstance(value, datetime):
            return value.date()
        if isinstance(python_type, type) and issubclass(python_type, enum.Enum):
            return python_type(value)
        if python_type is Decimal and not isinstance(value, Decimal):
            return Decimal(str(value))
    except (TypeError, ValueError):
        return value
    return value


def _from_document(model: type, document: dict[str, Any]) -> Any:
    values = {
        column.key: _restore(column, document.get(column.key))
        for column in model.__table__.columns
        if column.key in document
    }
    return model(**values)


class MongoQuery:
    def __init__(self, session: "MongoSession", *entities: Any):
        self.session = session
        self.entities = entities
        self.model = self._find_model()
        self.filters: list[Any] = []
        self.ordering: list[tuple[str, int]] = []
        self.offset_count = 0
        self.limit_count: int | None = None
        self.is_distinct = False

    def _find_model(self) -> type:
        for entity in self.entities:
            if isinstance(entity, type) and hasattr(entity, "__table__"):
                return entity
            model = getattr(entity, "class_", None)
            if model is not None:
                return model
        raise NotImplementedError("Mongo query needs at least one mapped model/column.")

    def filter(self, *expressions: Any):
        self.filters.extend(expressions)
        return self

    def filter_by(self, **values: Any):
        for key, value in values.items():
            self.filters.append(getattr(self.model, key) == value)
        return self

    def order_by(self, *expressions: Any):
        for expression in expressions:
            direction = ASCENDING
            column = expression
            modifier = getattr(expression, "modifier", None)
            if modifier and getattr(modifier, "__name__", "") == "desc_op":
                direction = DESCENDING
                column = expression.element
            self.ordering.append((getattr(column, "key", str(column)), direction))
        return self

    def limit(self, count: int):
        self.limit_count = count
        return self

    def offset(self, count: int):
        self.offset_count = count
        return self

    def distinct(self):
        self.is_distinct = True
        return self

    def with_for_update(self, *_args: Any, **_kwargs: Any):
        return self

    def join(self, *_args: Any, **_kwargs: Any):
        return self

    def outerjoin(self, *_args: Any, **_kwargs: Any):
        return self

    def _rows(self) -> list[Any]:
        collection = self.session.database[_collection_name(self.model)]
        documents = list(collection.find())
        rows = [_from_document(self.model, document) for document in documents]
        rows = [
            row for row in rows
            if all(_matches(expression, row) for expression in self.filters)
        ]
        for key, direction in reversed(self.ordering):
            rows.sort(
                key=lambda row: (getattr(row, key, None) is None, getattr(row, key, None)),
                reverse=direction == DESCENDING,
            )
        end = None if self.limit_count is None else self.offset_count + self.limit_count
        rows = rows[self.offset_count:end]
        self.session._tracked.extend(rows)
        return rows

    def all(self):
        rows = self._rows()
        if len(self.entities) == 1 and self.entities[0] is self.model:
            return rows
        projected = []
        for row in rows:
            values = tuple(_column_value(entity, row) for entity in self.entities)
            projected.append(values)
        if self.is_distinct:
            projected = list(dict.fromkeys(projected))
        return projected

    def first(self):
        rows = self.limit(1).all()
        return rows[0] if rows else None

    def one_or_none(self):
        rows = self.limit(2).all()
        if len(rows) > 1:
            raise RuntimeError("Expected one MongoDB document, found multiple.")
        return rows[0] if rows else None

    def count(self) -> int:
        return len(self._rows())

    def delete(self, synchronize_session: Any = None) -> int:
        rows = self._rows()
        collection = self.session.database[_collection_name(self.model)]
        ids = [str(getattr(row, "id")) for row in rows]
        return collection.delete_many({"_id": {"$in": ids}}).deleted_count


class MongoSession:
    """Request-scoped unit of work using the shared MongoClient pool."""

    def __init__(self):
        self.database = get_mongo_db()
        self._tracked: list[Any] = []
        self._deleted: list[Any] = []

    def query(self, *entities: Any) -> MongoQuery:
        return MongoQuery(self, *entities)

    def add(self, instance: Any) -> None:
        self._tracked.append(instance)

    def add_all(self, instances: list[Any]) -> None:
        self._tracked.extend(instances)

    def delete(self, instance: Any) -> None:
        self._deleted.append(instance)

    def flush(self) -> None:
        self.commit()

    def refresh(self, instance: Any) -> None:
        document = self.database[_collection_name(type(instance))].find_one(
            {"_id": str(getattr(instance, "id"))}
        )
        if document:
            fresh = _from_document(type(instance), document)
            for column in instance.__table__.columns:
                setattr(instance, column.key, getattr(fresh, column.key, None))

    def commit(self) -> None:
        seen: set[tuple[type, str]] = set()
        for instance in self._tracked:
            document = _to_document(instance)
            key = (type(instance), document["_id"])
            if key in seen:
                continue
            seen.add(key)
            self.database[_collection_name(type(instance))].replace_one(
                {"_id": document["_id"]}, document, upsert=True
            )
        for instance in self._deleted:
            self.database[_collection_name(type(instance))].delete_one(
                {"_id": str(getattr(instance, "id"))}
            )
        self._tracked.clear()
        self._deleted.clear()

    def rollback(self) -> None:
        self._tracked.clear()
        self._deleted.clear()

    def close(self) -> None:
        self._tracked.clear()
        self._deleted.clear()


def get_mongo_session():
    session = MongoSession()
    try:
        yield session
    finally:
        session.close()
