import sys
import random
from instagrapi import Client

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
    account = random.choice(ACCOUNTS)
    print(f"DEBUG: {account['username']} bilan login qilinmoqda...", file=sys.stderr)
    
    cl = Client()
    cl.login(account["username"], account["password"])
    print(f"DEBUG: Login muvaffaqiyatli!", file=sys.stderr)
    
    media_pk = cl.media_pk_from_url(instagram_url)
    print(f"DEBUG: media_pk: {media_pk}", file=sys.stderr)
    
    media_info = cl.media_info(media_pk)
    return str(media_info.video_url)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("ERROR: URL berilmadi", file=sys.stderr)
        sys.exit(1)
    
    url = sys.argv[1]
    
    try:
        video_url = get_video_url(url)
        print(video_url)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
