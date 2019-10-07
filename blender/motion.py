import os
import re
import subprocess
from pathlib import Path

import bpy
import mathutils

BONE = "forearmR"
FLOAT_RE = re.compile(r"\d+(?:\.\d*(?:e[-+]\d+)?)?")
PIPE_PATH = "/tmp/imu-relay.pipe"

fp = None
active = False

print("objects =", bpy.data.objects.keys())
ob = bpy.data.objects["Armature"]
print("bones =", ob.pose.bones.keys())


def update_angle():
    if not active or not fp:
        return 0.1
    line = None
    while True:
        line2 = fp.readline()
        if not line2:
            break
        line = line2
    if line and line.startswith("quaternion:"):
        q_angle = [float(s) for s in re.findall(FLOAT_RE, line)]
        if len(q_angle) == 4:
            ob.pose.bones[BONE].rotation_quaternion = mathutils.Vector(q_angle)
        else:
            print("Skipping:", line)
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
        if not Path(PIPE_PATH).exists():
            subprocess.run(["mkfifo", PIPE_PATH], check=True)
        fp = open(
            PIPE_PATH, "r", opener=lambda p, _f: os.open(p, os.O_RDONLY | os.O_NONBLOCK)
        )
        return {"RUNNING_MODAL"}


bpy.utils.register_class(ModalOperator)
bpy.ops.object.modal_operator("INVOKE_DEFAULT")
