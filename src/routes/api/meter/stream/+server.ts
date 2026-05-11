import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      const sendData = () => {
        const powerWatts = generatePowerReading();
        const timestamp = Date.now();

        const data = {
          timestamp,
          powerWatts,
          meterId: 'SMART-METER-001'
        };

        const chunk = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      sendData();
      interval = setInterval(sendData, 1000);
    },
    cancel() {
      if (interval) {
        clearInterval(interval);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

function generatePowerReading(): number {
  const baseLoad = 15000;
  const variance = Math.random() * 10000;
  const spike = Math.random() > 0.9 ? Math.random() * 8000 : 0;
  
  const hour = new Date().getHours();
  let multiplier = 1;
  if (hour >= 8 && hour < 12) {
    multiplier = 1.3;
  } else if (hour >= 18 && hour < 22) {
    multiplier = 1.4;
  } else if (hour >= 23 || hour < 6) {
    multiplier = 0.6;
  } else if (hour >= 12 && hour < 18) {
    multiplier = 1.0;
  } else {
    multiplier = 0.85;
  }

  return Math.round((baseLoad + variance + spike) * multiplier);
}
