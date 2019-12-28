from micropython import const
import bluetooth

_IRQ_CENTRAL_CONNECT = const(1 << 0)
_IRQ_CENTRAL_DISCONNECT = const(1 << 1)
_IRQ_GATTS_WRITE = const(1 << 2)
_IRQ_GATTS_READ_REQUEST = const(1 << 3)
_IRQ_SCAN_RESULT = const(1 << 4)
_IRQ_SCAN_COMPLETE = const(1 << 5)
_IRQ_PERIPHERAL_CONNECT = const(1 << 6)
_IRQ_PERIPHERAL_DISCONNECT = const(1 << 7)
_IRQ_GATTC_SERVICE_RESULT = const(1 << 8)
_IRQ_GATTC_CHARACTERISTIC_RESULT = const(1 << 9)
_IRQ_GATTC_DESCRIPTOR_RESULT = const(1 << 10)
_IRQ_GATTC_READ_RESULT = const(1 << 11)
_IRQ_GATTC_WRITE_STATUS = const(1 << 12)
_IRQ_GATTC_NOTIFY = const(1 << 13)
_IRQ_GATTC_INDICATE = const(1 << 14)

connections = set()


def bt_irq_handler(event, data):
    if event == _IRQ_CENTRAL_CONNECT:
        conn_handle, _addr_type, _addr = data
        print("BT connect", conn_handle)
        connections.add(conn_handle)
    elif event == _IRQ_CENTRAL_DISCONNECT:
        conn_handle, _addr_type, _addr = data
        print("BT disconnect", conn_handle)
        connections.remove(conn_handle)
    elif event == _IRQ_GATTS_WRITE:
        conn_handle, attr_handle = data
        msg = bt.gatts_read(attr_handle)
        print("BT Rx({}, {})".format(conn_handle, attr_handle), msg)
        if attr_handle == rx and msg == b"ping\n":
            transmit("pong\n")
    elif event == _IRQ_GATTC_READ_RESULT:
        conn_handle, _value_handle, _char_data = data
        print("BT Rx", conn_handle)
    elif event == _IRQ_GATTC_WRITE_STATUS:
        conn_handle, _value_handle, _status = data
        print("BT Tx1", conn_handle)


def transmit(data):
    for conn in connections:
        bt.gatts_notify(conn, tx, data)


bt = bluetooth.BLE()

print("Activating BLE...")
bt.active(True)

HR_SERVICE_UUID = bluetooth.UUID(0x180D)
UART_SERVICE_UUID = bluetooth.UUID("6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
UART_TX_CHAR_UUID = bluetooth.UUID("6E400003-B5A3-F393-E0A9-E50E24DCCA9E")
UART_RX_CHAR_UUID = bluetooth.UUID("6E400002-B5A3-F393-E0A9-E50E24DCCA9E")

HR_CHAR = (bluetooth.UUID(0x2A37), bluetooth.FLAG_READ | bluetooth.FLAG_NOTIFY)
HR_SERVICE = (HR_SERVICE_UUID, (HR_CHAR,))
UART_TX_CHAR = (UART_TX_CHAR_UUID, bluetooth.FLAG_READ | bluetooth.FLAG_NOTIFY)
UART_RX_CHAR = (UART_RX_CHAR_UUID, bluetooth.FLAG_WRITE)
UART_SERVICE = (UART_SERVICE_UUID, (UART_TX_CHAR, UART_RX_CHAR))
SERVICES = (HR_SERVICE, UART_SERVICE)
((hr,), (tx, rx)) = bt.gatts_register_services(SERVICES)

bt.irq(bt_irq_handler)


def advertise():
    bt.gap_advertise(
        100,
        b"\x02\x01\x1a\x03\x03\x10\x10\x0b\tNYUSHIMA-P\x0b\xffL\x00\x10\x06\x13\x1a:\xe1u\x0c",
    )


advertise()
