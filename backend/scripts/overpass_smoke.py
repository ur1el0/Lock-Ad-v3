"""Explicit live smoke test for Overpass; run manually when needed."""

import requests


def main():
    url = 'https://overpass-api.de/api/interpreter'
    query = """
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](13.91,121.58,13.97,121.65);
    );
    out center;
    """
    headers = {
        'User-Agent': 'LockAd/1.0',
        'Accept': 'application/json',
    }
    response = requests.post(url, data={'data': query}, headers=headers, timeout=30)
    response.raise_for_status()
    print(response.status_code)
    print(response.text[:200])


if __name__ == '__main__':
    main()
