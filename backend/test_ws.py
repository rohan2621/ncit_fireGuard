import asyncio
import websockets
async def main():
    try:
        async with websockets.connect("ws://localhost:8000/ws/live") as ws:
            print("✅ Connected to WebSocket")
            while True:
                msg = await ws.recv()
                print("📩", msg)
    except Exception as e:
        print("❌ Error:", e)
asyncio.run(main())
