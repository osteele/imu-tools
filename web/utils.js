export const isMobile = Boolean(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

// Apply callback no more than once per animation frame
export function throttled(callback) {
    const buffer = [];
    return data => {
        if (buffer.length == 0) {
            requestAnimationFrame(function () {
                callback(buffer.pop());
            })
        }
        buffer[0] = data;
    }
}
