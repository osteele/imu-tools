class BNO055:
    __counter = 1

    def operation_mode(self, *args):
        pass

    def temperature(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return 1 + frac

    def accelerometer(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return (20 + frac, 21 + frac, 22 + frac)

    def euler(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return (30 + frac, 31 + frac, 32 + frac)

    def gravity(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return (40 + frac, 41 + frac, 42 + frac)

    def gyroscope(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return (50 + frac, 51 + frac, 52 + frac)

    def linear_acceleration(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return (60 + frac, 61 + frac, 62 + frac)

    def magnetometer(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return (70 + frac, 71 + frac, 72 + frac)

    def quaternion(self):
        frac = self.__counter / 1000
        self.__counter += 1
        self.__counter %= 1000
        return (80 + frac, 81 + frac, 82 + frac)
