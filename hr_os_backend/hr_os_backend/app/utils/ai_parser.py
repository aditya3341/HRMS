def parse_resume_with_ai(resume_text: str) -> dict:
    """
    This is a placeholder for AI parsing.
    Later you will replace this with OpenAI / LLM calls.
    """
    lines = resume_text.lower().split("\n")

    skills = []
    experience_years = 0

    for line in lines:
        if "python" in line:
            skills.append("Python")
        if "fastapi" in line:
            skills.append("FastAPI")
        if "react" in line:
            skills.append("React")

        if "years" in line:
            experience_years += 1

    return {
        "skills": list(set(skills)),
        "experience_years": experience_years,
    }