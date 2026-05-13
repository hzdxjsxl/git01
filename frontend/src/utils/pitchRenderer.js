const PITCH_WIDTH = 100;
const PITCH_HEIGHT = 68;

export class PitchRenderer {
  constructor() {
    this.grassColor = '#1e7a3e';
    this.lineColor = '#ffffff';
    this.lineWidth = 2;
  }

  drawPitch(ctx, width, height) {
    const scaleX = width / PITCH_WIDTH;
    const scaleY = height / PITCH_HEIGHT;

    this.drawGrass(ctx, width, height);
    this.drawBoundaries(ctx, scaleX, scaleY);
    this.drawCenterCircle(ctx, scaleX, scaleY);
    this.drawCenterLine(ctx, width, scaleY);
    this.drawPenaltyAreas(ctx, scaleX, scaleY);
    this.drawGoalAreas(ctx, scaleX, scaleY);
    this.drawPenaltySpots(ctx, scaleX, scaleY);
    this.drawGoals(ctx, scaleX, scaleY);
  }

  drawGrass(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#228b44');
    gradient.addColorStop(0.5, '#1e7a3e');
    gradient.addColorStop(1, '#196b33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const stripeWidth = width / 20;
    for (let i = 0; i < 20; i++) {
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(i * stripeWidth, 0, stripeWidth, height);
      }
    }
  }

  drawBoundaries(ctx, scaleX, scaleY) {
    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeRect(0, 0, PITCH_WIDTH * scaleX, PITCH_HEIGHT * scaleY);
  }

  drawCenterCircle(ctx, scaleX, scaleY) {
    ctx.beginPath();
    ctx.arc(PITCH_WIDTH / 2 * scaleX, PITCH_HEIGHT / 2 * scaleY, 9.15 * Math.min(scaleX, scaleY), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(PITCH_WIDTH / 2 * scaleX, PITCH_HEIGHT / 2 * scaleY, 3, 0, Math.PI * 2);
    ctx.fillStyle = this.lineColor;
    ctx.fill();
  }

  drawCenterLine(ctx, width, scaleY) {
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, PITCH_HEIGHT * scaleY);
    ctx.stroke();
  }

  drawPenaltyAreas(ctx, scaleX, scaleY) {
    const boxWidth = 16.5 * scaleX;
    const boxHeight = 40.32 * scaleY;
    const yOffset = (PITCH_HEIGHT * scaleY - boxHeight) / 2;

    ctx.strokeRect(0, yOffset, boxWidth, boxHeight);
    ctx.strokeRect(PITCH_WIDTH * scaleX - boxWidth, yOffset, boxWidth, boxHeight);
  }

  drawGoalAreas(ctx, scaleX, scaleY) {
    const boxWidth = 5.5 * scaleX;
    const boxHeight = 18.32 * scaleY;
    const yOffset = (PITCH_HEIGHT * scaleY - boxHeight) / 2;

    ctx.strokeRect(0, yOffset, boxWidth, boxHeight);
    ctx.strokeRect(PITCH_WIDTH * scaleX - boxWidth, yOffset, boxWidth, boxHeight);
  }

  drawPenaltySpots(ctx, scaleX, scaleY) {
    const spotY = PITCH_HEIGHT / 2 * scaleY;
    
    ctx.beginPath();
    ctx.arc(11 * scaleX, spotY, 3, 0, Math.PI * 2);
    ctx.fillStyle = this.lineColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc((PITCH_WIDTH - 11) * scaleX, spotY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGoals(ctx, scaleX, scaleY) {
    const goalHeight = 7.32 * scaleY;
    const goalDepth = 2 * scaleX;
    const goalY = (PITCH_HEIGHT * scaleY - goalHeight) / 2;

    ctx.strokeStyle = this.lineColor;
    ctx.lineWidth = 3;

    ctx.strokeRect(-goalDepth, goalY, goalDepth, goalHeight);
    ctx.strokeRect(PITCH_WIDTH * scaleX, goalY, goalDepth, goalHeight);

    ctx.lineWidth = this.lineWidth;
  }
}
