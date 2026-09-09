/** All series in a plot start together and share one sample index. */
export class PlotBuffer {
  index = 0
  private readonly values: Float64Array[]
  private readonly rendered: Float64Array[]
  private readonly x: Float64Array

  constructor(
    readonly sourceIds: string[],
    readonly capacity: number,
  ) {
    this.values = sourceIds.map(() => new Float64Array(capacity))
    this.rendered = sourceIds.map(() => new Float64Array(capacity))
    this.x = new Float64Array(capacity)
  }

  sample(read: (id: string) => number) {
    const slot = this.index % this.capacity
    this.sourceIds.forEach((id, i) => {
      this.values[i][slot] = read(id)
    })
    this.index++
  }

  data(): Float64Array[] {
    const length = Math.min(this.index, this.capacity)
    const start = this.index >= this.capacity ? this.index % this.capacity : 0
    for (let i = 0; i < length; i++) {
      this.x[i] = this.index - length + i
      this.values.forEach((values, series) => {
        this.rendered[series][i] = values[(start + i) % this.capacity]
      })
    }
    return [
      this.x.subarray(0, length),
      ...this.rendered.map((values) => values.subarray(0, length)),
    ]
  }

  reset() {
    this.index = 0
    this.values.forEach((values) => values.fill(0))
  }
}
