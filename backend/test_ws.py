import asyncio
import websockets

print("Testing websockets library...")

async def echo(websocket):
    print("Client connected!")
    async for message in websocket:
        print(f"Received: {message}")
        await websocket.send(f"Echo: {message}")

async def main():
    print("Starting server on ws://localhost:8001")
    async with websockets.serve(echo, "localhost", 8001):
        print("Server running...")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
