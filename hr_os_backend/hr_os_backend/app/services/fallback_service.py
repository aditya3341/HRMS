class FallbackService:
    @staticmethod
    def parse_resume_fallback(resume_text: str) -> dict:
        """
        Rule-based parser used when AI is disabled.
        """
        lines = resume_text.lower().split("\n")
        skills = []
        experience_years = 0

        # Basic keyword matching
        keywords = ["python", "javascript", "react", "fastapi", "sql", "aws", "docker"]
        for line in lines:
            for kw in keywords:
                if kw in line:
                    skills.append(kw.title())
            if "years" in line:
                experience_years += 1

        return {
            "skills": list(set(skills)),
            "experience_years": min(experience_years, 20),
            "method": "rule_based_fallback"
        }
