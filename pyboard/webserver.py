import socket

#
# Web Server
#

HTTP_SOCKET = None


def create_web_page_content(mqtt_client, sensor_data):
    # pylint: disable=line-too-long
    html = """
<html><head> <title>ESP BO055 IMU</title> <meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="1">
<link rel="icon" href="data:,"> <style>html{font-family: Helvetica; display:inline-block; margin: 0px auto; text-align: center;}
h1{color: #0F3376; padding: 2vh;}p{font-size: 1.5rem;}.button{display: inline-block; background-color: #e7bd3b; border: none;
border-radius: 4px; color: white; padding: 16px 40px; text-decoration: none; font-size: 30px; margin: 2px; cursor: pointer;}
.button2{background-color: #4286f4;}</style></head><body> <h1>ESP BO055 IMU</h1>"""
    if mqtt_client:
        html += "<p>Connected to mqtt://" + mqtt_client.server + "</p>"
    if sensor_data:
        for k, v in sensor_data.items():
            html += "<p>" + k + ": <strong>" + str(v) + "</strong></p>"
    html += """
<p><a href="/?led=on"><button class="button">ON</button></a></p>
<p><a href="/?led=off"><button class="button button2">OFF</button></a></p></body></html>"""
    return html


def start_http_server(wifi_station):
    global HTTP_SOCKET

    HTTP_SOCKET = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        HTTP_SOCKET.bind(("", 80))
    except OSError as err:
        if err.args[0] == 112:
            print(err)
            return
        raise err
    HTTP_SOCKET.listen(5)
    ip_address, _subnet_mask, _gateway, _dns_server = wifi_station.ifconfig()
    print("Listening on http://" + ip_address)


def service_http_request(mqtt_client, sensor_data):
    global HTTP_SOCKET
    try:

        conn, addr = HTTP_SOCKET.accept()
        connected = True
    except OSError:  # EAGAIN
        connected = False
    if connected:
        print("Received HTTP request from", addr[0])
        # request = conn.recv(1024)
        # print("Content =", request)
        response = create_web_page_content(mqtt_client, sensor_data)
        conn.send(b"HTTP/1.1 200 OK\n")
        conn.send(b"Content-Type: text/html\n")
        conn.send(b"Connection: close\n\n")
        conn.sendall(response)
        conn.close()
