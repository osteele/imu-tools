import gc
import os

import esp
import machine
import network
import utime

from config import WIFI_NETWORKS as ssid_passwords

esp.osdebug(None)
gc.collect()

print("\nDevice type =", os.uname().sysname)
print("HMAC =", ":".join(map("{:02x}".format, machine.unique_id())))


def wifi_connect():
    station = network.WLAN(network.STA_IF)
    station.active(True)
    if station.isconnected():
        print('Connected to WiFi network "' + station.config("essid") + '"')
    else:
        ssids = [service[0].decode() for service in station.scan()]
        known_ssids = [ssid for ssid in ssids if ssid in ssid_passwords]

        if known_ssids:
            ssid = known_ssids[0]
            password = ssid_passwords[ssid]
            station.connect(ssid, password)
            print('Connecting to WiFi network "' + ssid + '"', end="...")
            while not station.isconnected():
                utime.sleep_ms(250)
                print(end=".")

            ip_address, _subnet_mask, _gateway, _dns_server = station.ifconfig()
            print("success.\nIP address =", ip_address)
        elif ssids:
            ssid_names = list(dict([(s, 1) for s in ssids]).keys())
            ssid_names.sort(key=lambda s: s.lower())
            print("No known WiFi network in", ", ".join(ssid_names))
        else:
            print("No WiFi networks found")


wifi_connect()
