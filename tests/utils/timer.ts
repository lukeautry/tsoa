export class Timer {
  private readonly startTime = new Date().getTime();

  public elapsed() {
    return new Date().getTime() - this.startTime;
  }
}
