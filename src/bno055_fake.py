class BNO055:
    def operation_mode(self, *args):
        pass

    def temperature(self):
        return 1.0

    def accelerometer(self):
        return (2.0, 2.1, 2.2)

    def euler(self):
        return (3.0, 3.1, 3.2)

    def gravity(self):
        return (4.0, 4.1, 4.2)

    def gyroscope(self):
        return (5.0, 5.1, 5.2)

    def linear_acceleration(self):
        return (6.0, 6.1, 6.2)

    def magnetometer(self):
        return (7.0, 7.1, 7.2)

    def quaternion(self):
        return (8.0, 8.1, 8.2)
