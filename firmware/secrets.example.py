# Copy to secrets.py (gitignored) and fill in.
WIFI_SSID = "your-ssid"
WIFI_PASS = "your-password"
HOSTNAME = "picowallet"
APP_URL = "http://<mac-lan-ip>:3001"
DEVICE_NAME = "picowallet"

# Passwordless MicroPython REPL on TCP/2323. Full signer control: isolated development only.
ENABLE_NETWORK_CONSOLE = False

# Production forks: pin all three after deploying. None keeps the PoC development workflow flexible.
EXPECTED_CHAIN_ID = None
EXPECTED_VAULT = None
EXPECTED_TOKEN = None
# Without an ATECC608 the wallet stops on a NO CHIP screen. True runs it on a throwaway software
# key instead (the emulator does this); never on a board that should hold value.
ALLOW_SOFT_KEY = False
# Provisioning a FRESH chip from the app's Setup page. Both are permanent; leave False otherwise.
ALLOW_LOCK = False     # lock the config zone once (required before the chip will make a key)
ALLOW_GENKEY = False   # make a new key in slot 0, replacing the old one
# ATECC608 bus pins. GP4/GP5 is the wallet wiring; set these only for a board where those pins
# are taken (a clone with something on GP5, say). Any two free GPIOs work.
# ATECC_SDA = 4
# ATECC_SCL = 5
