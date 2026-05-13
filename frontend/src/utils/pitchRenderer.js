const PITCH_WIDTH = 100;
const PITCH_HEIGHT = 68;

export class PitchRenderer {
  constructor() {
    this.grassColor = '#1e7a3e';
    this.lineColor = '#ffffff';
    this.lineWidth = 2;
  }

  drawPitch(ctx, width, height) {
    console.log('[PitchRenderer] drawPitch called with:', width, 'x', height);

    const scaleX = width / PITCH_WIDTH;
    const scaleY = height / PITCH_HEIGHT;

    this.drawGrass(ctx, width, height);
    this.drawBoundaries(ctx, width, height);
    this.drawCenterLine(ctx, width, height);
    this.drawCenterCircle(ctx, width, height, scaleX, scaleY);
    this.drawPenaltyAreas(ctx, width, height, scaleX, scaleY);
    this.drawGoalAreas(ctx, width, height, scaleX, scaleY);
    this.drawPenaltySpots(ctx, width, height, scaleX, scaleY);
    this.drawGoals(ctx, width, height, scaleX, scaleY);
  }

  drawGrass(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2d8b4f');
    gradient.addColorStop(0.5, '#228b44');
    gradient.addColorStop(1, '#1e7a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const stripeCount = 10;
    const stripeWidth = width / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, height);
      }
    }
  }

  drawBoundaries(ctx, width, height) {
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.rect(this.lineWidth / 2, this.lineWidth / 2, width - this.lineWidth, height - this.lineWidth);
    ctx.stroke();
  }

  drawCenterLine(ctx, width, height) {
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
  }

  drawCenterCircle(ctx, width, height, scaleX, scaleY) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 9.15 * Math.min(scaleX, scaleY);

    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.lineColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPenaltyAreas(ctx, width, height, scaleX, scaleY) {
    const boxWidth = 16.5 * scaleX;
    const boxHeight = 40.32 * scaleY;
    const yOffset = (height - boxHeight) / 2;

    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;

    ctx.beginPath();
    ctx.rect(0, yOffset, boxWidth, boxHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(width - boxWidth, yOffset, boxWidth, boxHeight);
    ctx.stroke();
  }

  drawGoalAreas(ctx, width, height, scaleX, scaleY) {
    const boxWidth = 5.5 * scaleX;
    const boxHeight = 18.32 * scaleY;
    const yOffset = (height - boxHeight) / 2;

    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;

    ctx.beginPath();
    ctx.rect(0, yOffset, boxWidth, boxHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(width - boxWidth, yOffset, boxWidth, boxHeight);
    ctx.stroke();
  }

  drawPenaltySpots(ctx, width, height, scaleX, scaleY) {
    const spotY = height / 2;

    ctx.fillStyle = this.lineColor;
    ctx.beginPath();
    ctx.arc(11 * scaleX, spotY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width - 11 * scaleX, spotY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGoals(ctx, width, height, scaleX, scaleY) {
    const goalHeight = 7.32 * scaleY;
    const goalDepth = 2 * scaleX;
    const goalY = (height - goalHeight) / 2;

    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.rect(-goalDepth, goalY, goalDepth, goalHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(width, goalY, goalDepth, goalHeight);
    ctx.stroke();
  }
}
