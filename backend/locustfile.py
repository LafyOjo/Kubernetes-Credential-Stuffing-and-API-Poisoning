# locustfile.py
from locust import HttpUser, task, between, tag
import random

PASSWORDS = ["hunter2", "password123", "letmein!", "CorrectHorseBatteryStaple", "P@ssw0rd"]

class BaseUser(HttpUser):
    wait_time = between(1, 3)

    # Common browsing
    @task(3)
    def home(self):
        self.client.get("/", name="GET /")

    @task(1)
    def docs(self):
        self.client.get("/docs", name="GET /docs")

    # Helper used by subclasses
    def _post_score(self, who: str):
        payload = {
            "user": who,
            # include a changing field to mimic attempts / variability
            "password": random.choice(PASSWORDS),
        }
        # Name requests distinctly so the dashboard separates Ben vs Alice stats
        self.client.post("/score", json=payload, name=f"POST /score ({who})")


class BenUser(BaseUser):
    weight = 3  # relative share of traffic
    @task(2)
    @tag("ben")
    def score_ben(self):
        self._post_score("ben")


class AliceUser(BaseUser):
    weight = 2  # adjust to control traffic mix
    @task(2)
    @tag("alice")
    def score_alice(self):
        self._post_score("alice")
