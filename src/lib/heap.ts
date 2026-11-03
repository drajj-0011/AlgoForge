/**
 * Binary min-heap keyed by numeric priority.
 * Ties break toward the most recently pushed node, which makes A*
 * dives look decisively goal-directed on open grids.
 */
export class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  private seq: number[] = [];
  private counter = 0;

  get size(): number {
    return this.items.length;
  }

  push(item: number, priority: number): void {
    this.items.push(item);
    this.prio.push(priority);
    this.seq.push(this.counter++);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.less(i, parent)) {
        this.swap(i, parent);
        i = parent;
      } else break;
    }
  }

  pop(): number {
    const n = this.items.length;
    if (n === 0) return -1;
    const top = this.items[0];
    const lastItem = this.items[n - 1];
    const lastPrio = this.prio[n - 1];
    const lastSeq = this.seq[n - 1];
    this.items.pop();
    this.prio.pop();
    this.seq.pop();
    if (n > 1) {
      this.items[0] = lastItem;
      this.prio[0] = lastPrio;
      this.seq[0] = lastSeq;
      let i = 0;
      const size = n - 1;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let best = i;
        if (l < size && this.less(l, best)) best = l;
        if (r < size && this.less(r, best)) best = r;
        if (best === i) break;
        this.swap(i, best);
        i = best;
      }
    }
    return top;
  }

  private less(a: number, b: number): boolean {
    if (this.prio[a] !== this.prio[b]) return this.prio[a] < this.prio[b];
    return this.seq[a] > this.seq[b];
  }

  private swap(a: number, b: number): void {
    const ti = this.items[a];
    this.items[a] = this.items[b];
    this.items[b] = ti;
    const tp = this.prio[a];
    this.prio[a] = this.prio[b];
    this.prio[b] = tp;
    const ts = this.seq[a];
    this.seq[a] = this.seq[b];
    this.seq[b] = ts;
  }
}