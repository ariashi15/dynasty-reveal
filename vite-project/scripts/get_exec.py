import json
from collections import defaultdict

# Exec member emails
exec_emails = {
    "ariashi2027@u.northwestern.edu",
    "aliciali2027@u.northwestern.edu",
    "hongxiaoli2028@u.northwestern.edu",
    "gillianho2029@u.northwestern.edu",
    "selinaxu2028@u.northwestern.edu",
    "maxqu2028@u.northwestern.edu",
    "rebeccagu2027@u.northwestern.edu",
    "charlottezhou2029@u.northwestern.edu",
    "katiechen2029@u.northwestern.edu",
    "huaxing2029@u.northwestern.edu",
    "giannaliu2029@u.northwestern.edu",
    "ethanlin2029@u.northwestern.edu",
    "sarasimmons2029@u.northwestern.edu",
    "kaylee2028@u.northwestern.edu",
    "ashleyzhou2028@u.northwestern.edu",
    "joyfan2029@u.northwestern.edu",
    "angelinamo2028@u.northwestern.edu",
    "ensonpan2027@u.northwestern.edu",
    "angelinaxu2029@u.northwestern.edu",
    "nelsonzhao2028@u.northwestern.edu",
    "jonathanwei2028@u.northwestern.edu",
    "tonycheng2028@u.northwestern.edu",
    "kaizhou2028@u.northwestern.edu",
    "ashlynzhao2029@u.northwestern.edu",
    "chelsealiu2027@u.northwestern.edu",
    "justintang2029@u.northwestern.edu",
    "jasmineguo2027@u.northwestern.edu",
    "gracehe2027@u.northwestern.edu",
    "sabrinaxu2029@u.northwestern.edu",
    "wanlinjiang2029.1@u.northwestern.edu",
    "ericdare2027@u.northwestern.edu",
    "georgesun2028@u.northwestern.edu",
    "charliezhang2029@u.northwestern.edu",
    "danielwu2029@u.northwestern.edu"
}

# Load JSON
with open("../public/dynasty-users.json", "r") as f:
    data = json.load(f)

users = data["users"]

# Dynasty buckets
dynasty_exec = {
    "earth": [],
    "fire": [],
    "wind": [],
    "water": []
}

# Find exec members and group by dynasty
for user in users.values():
    email = user.get("email", "").lower()
    dynasty = user.get("dynasty", "").lower()

    if email in exec_emails and dynasty in dynasty_exec:
        dynasty_exec[dynasty].append(email)

# Alphabetize
for dynasty in dynasty_exec:
    dynasty_exec[dynasty].sort()

# Print results
for dynasty in ["earth", "fire", "wind", "water"]:
    print(f"\n{dynasty.upper()} EXEC ({len(dynasty_exec[dynasty])})")
    print("-" * 40)

    for email in dynasty_exec[dynasty]:
        print(email)