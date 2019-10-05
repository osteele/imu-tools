import math
import os
import re
import sys
import time
from math import *
from pathlib import Path

import bpy
import mathutils

FLOAT_RE = re.compile(r"\d+(?:\.\d*)?")
PIPE_PATH = "/tmp/imu-relay.pipe"

fp = None
active = False

ob = bpy.data.objects["Armature"]


def updateAngles():
    s = time.time()
    euler = (pi / 10 * cos(1.2 * s), pi / 10 * cos(1.4 * s), s % (2 * pi))
    ob.pose.bones["armR"].rotation_quaternion = mathutils.Vector(euler2quat(*euler))


def euler2quat(yaw, pitch, roll):
    c1, s1 = cos(yaw / 2), sin(yaw / 2)
    c2, s2 = cos(pitch / 2), sin(pitch / 2)
    c3, s3 = cos(roll / 2), sin(roll / 2)
    w = c1 * c2 * c3 - s1 * s2 * s3
    x = s1 * s2 * c3 + c1 * c2 * s3
    y = s1 * c2 * c3 + c1 * s2 * s3
    z = c1 * s2 * c3 - s1 * c2 * s3
    return (x, y, z, w)


def update_angle():
    if not active or not fp:
        return 0.1
    line = fp.readline()
    if line and line.startswith("quaternion"):
        q_angle = [float(s) for s in re.findall(FLOAT_RE, line)]
        ob.pose.bones["armR"].rotation_quaternion = mathutils.Vector(q_angle)
    return 0.05


bpy.app.timers.register(update_angle)


class ModalOperator(bpy.types.Operator):
    bl_idname = "object.modal_operator"
    bl_label = "MoCap Modal Operator"

    def __init__(self):
        print("modal operator start")

    def __del__(self):
        print("modal operator stop")

    def execute(self, _context):
        return {"FINISHED"}

    def modal(self, _context, event):
        global active, fp
        if event.type in {"LEFTMOUSE", "ESC"}:
            active = False
            fp.close()
            fp = None
            return {"FINISHED"}
        if event.type in {"RIGHTMOUSE", "ESC"}:
            active = False
            return {"CANCELLED"}
        return {"RUNNING_MODAL"}

    def invoke(self, _context, _event):
        global active, fp
        active = True
        fp = open(
            PIPE_PATH, "r", opener=lambda p, _f: os.open(p, os.O_RDONLY | os.O_NONBLOCK)
        )
        return {"RUNNING_MODAL"}


bpy.utils.register_class(ModalOperator)
bpy.ops.object.modal_operator("INVOKE_DEFAULT")
