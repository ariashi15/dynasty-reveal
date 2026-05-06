import json
from collections import defaultdict

# Load JSON file
with open("../public/dynasty-users.json", "r") as f:
    data = json.load(f)

users = data["users"]

# Initialize dynasty groups
dynasty_emails = {
    "earth": [],
    "fire": [],
    "wind": [],
    "water": []
}

# Group emails by dynasty
for user_data in users.values():
    dynasty = user_data.get("dynasty", "").lower()
    email = user_data.get("email")

    if dynasty in dynasty_emails and email:
        dynasty_emails[dynasty].append(email)

# Sort each dynasty alphabetically
for dynasty in dynasty_emails:
    dynasty_emails[dynasty].sort()

# Print results
for dynasty in ["earth", "fire", "wind", "water"]:
    print(f"\n{dynasty.upper()} ({len(dynasty_emails[dynasty])})")
    print("-" * 30)

    for email in dynasty_emails[dynasty]:
        print(email)