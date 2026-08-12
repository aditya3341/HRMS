def calculate_pf(basic: int) -> int:
    return int(basic * 0.12)


def calculate_esi(gross: int) -> int:
    if gross <= 21000:
        return int(gross * 0.0075)
    return 0


def calculate_pt() -> int:
    return 200


def calculate_tds() -> int:
    # Placeholder – yearly tax engine later
    return 0