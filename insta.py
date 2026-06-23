import sys
import json
import random
from instagrapi import Client

# 7 ta akkaunt — tasodifiy biri tanlanadi
ACCOUNTS = [
    {"username": "comp30798", "password": "$UaL3piEgnc#_B&"},
    {"username": "seiyul190720002026", "password": "iyul19072000gmail.com"},
    {"username": "duiyul190720002026", "password": "iyul19072000gmail.com"},
    {"username": "aliniyul190720002026", "password": "iyul333333333!!!"},
    {"username": "iyul19072000", "password": "-z*n@2qk8xTv.w!"},
    {"username": "oydin66612026", "password": "#8bfq3@y9SUCaz2"},
    {"username": "dunyo07082022", "password": "Nm,8ygwN*?&Y6B5"},
]

def get_video_url(instagram_url: str) -> str:
    # Har safar tasodifiy akkaunt tanlanadi — bir akkaunt ko'p ishlatilmasin
    account = random.choice(ACCOUNTS)
    
    # instagrapi client yaratamiz
    cl = Client()
    
    # Login qilamiz
    cl.login(account["username"], account["password"])
    
    # URL dan media ID ni olamiz
    media_pk = cl.media_pk_from_url(instagram_url)
    
    # Media ma'lumotlarini olamiz
    media_info = cl.media_info(media_pk)
    
    # Video URL ni qaytaramiz
    return str(media_info.video_url)

if __name__ == "__main__":
    # NestJS dan: python3 insta.py "https://instagram.com/reel/..."
    if len(sys.argv) < 2:
        print("ERROR: URL berilmadi", file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    
    try:
        video_url = get_video_url(url)
        # Faqat URL ni chiqaramiz — NestJS shu qatorni o'qiydi
        print(video_url)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
