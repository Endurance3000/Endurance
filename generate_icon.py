from PIL import Image, ImageDraw

def create_endurance_icon():
    size = (1024, 1024)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer rounded rectangle (Material 3 Expressive continuous squircle / rounded rect)
    padding = 64
    rect = [padding, padding, size[0] - padding, size[1] - padding]
    radius = 256
    draw.rounded_rectangle(rect, radius=radius, fill=(14, 19, 27, 255), outline=(51, 65, 85, 255), width=8)

    # Inner circular glowing disc (music vinyl/stream metaphor)
    center = (512, 512)
    outer_r = 320
    draw.ellipse(
        [center[0] - outer_r, center[1] - outer_r, center[0] + outer_r, center[1] + outer_r],
        fill=(22, 30, 43, 255),
        outline=(125, 211, 252, 255),
        width=12
    )

    # Middle concentric groove
    mid_r = 200
    draw.ellipse(
        [center[0] - mid_r, center[1] - mid_r, center[0] + mid_r, center[1] + mid_r],
        fill=(12, 74, 110, 255),
        outline=(56, 189, 248, 180),
        width=6
    )

    # Center Play triangle in primary cyan (#7dd3fc)
    # Coordinates centered slightly shifted to look optically balanced
    tri = [
        (450, 400),
        (450, 624),
        (620, 512)
    ]
    draw.polygon(tri, fill=(125, 211, 252, 255))

    img.save("app-icon.png", "PNG")
    print("Created app-icon.png successfully")

if __name__ == "__main__":
    create_endurance_icon()
