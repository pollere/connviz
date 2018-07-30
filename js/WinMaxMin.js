//winMaxMin.js

/*
 * Adapted to javascript from Kathleen Nichols' algorithm in C for
 * tracking the min (or max) value of a data stream over some fixed
 * time interval. (E.g., the minimum RTT over the past two minutes.)
 * It uses constant space and constant time per update yet almost 
 * always delivers the same minimum as an implementation that has to
 * keep all the data in the window.
 *
 * The algorithm keeps track of the best, 2nd best & 3rd best max(min)
 * values, maintaining an invariant that the measurement time of the
 * n'th best >= n-1'th best.  It also makes sure that the three values
 * are widely separated in the time window since that bounds the worse
 * case error when that data is monotonically increasing over the window.
 */

export class WinMax {
    constructor(win, t, v) {
        // win is the expiration time for a max
        this.win = win;
        //initialize the max history with the first measurement
        // mh tracks the current max m0, 2nd choice m1 and 3rd choice m2
        this.mh = {
            m0: {tm: +t, val: +v},
            m1: {tm: +t, val: +v},
            m2: {tm: +t, val: +v}
        };
    }
    setWindow(win) { this.win = win; }
    //returns last/current maximum
    // might want to return undefined if current max outside win
    currentMax() { return this.mh.m0.val; }

    //set all the max history values to this measurement
    setAll(t, v) {
        Object.assign(this.mh.m0, {tm: +t, val: +v});
        Object.assign(this.mh.m1, {tm: +t, val: +v});
        Object.assign(this.mh.m2, {tm: +t, val: +v});
    }

    //update with a new measurement of value v at time t
    //  and return the max over the current time window
    update(t, v) {
        //for gap in updates greater than the window or for a new
        //  max, forget earlier history and reset to current value
        if (t - this.mh.m2.t > this.win || +v - this.mh.m0.val >= 0) {
            // big gap in time - we have nothing in the window
            this.setAll(t, v);
            return v;
        }

        /* check if new measurement updates the 1st, 2nd or 3rd choice max
            Note: for windowed max instead of min, change the '<=' in these
            three 'if' statements to '>='.
        */
        let m0 = this.mh.m0;
        let m1 = this.mh.m1;
        let m2 = this.mh.m2;
        if (+v - m1.val >= 0) {
            Object.assign(m1, {tm: +t, val: +v});
            Object.assign(m2, {tm: +t, val: +v});
        } else if (+v - m2.val >= 0) {
            Object.assign(m2, {tm: +t, val: +v});
        }

        let dt = +t - m0.tm;
        if (dt > this.win) {
            /* passed entire window without a new max so make 2nd
                choice the new max & 3rd choice the new 2nd choice.
                we may have to iterate this since our 2nd choice
                may also be outside the window (we checked that the
                third choice was in the window on entry)
            */
            Object.assign(m0, m1);
            Object.assign(m1, m2);
            Object.assign(m2, {tm: +t, val: +v});
            if (+t - m0.tm > this.win) {
                Object.assign(m0, m1);
                Object.assign(m1, m2);
                Object.assign(m2, {tm: +t, val: +v});
            }
        } else if (m1.tm === m0.tm && dt > this.win/4.) {
            // passed a quarter of the window without a new min
            // so take a 2nd choice from the 2nd quarter of the window.
            Object.assign(m1, {tm: +t, val: +v});
            Object.assign(m2, {tm: +t, val: +v});
        } else if (m2.tm === m1.tm && dt > this.win/2.) {
            // passed half the window without finding a new min
            // so take a 3rd choice from the last half of the window
            Object.assign(m2, {tm: +t, val: +v});
        }

        return m0.val;
    }
};

export class WinMin {
    constructor(win, t, v) {
        // win is the expiration time for a min
        this.win = win;
        //initialize the in history with the first measurement
        // mh tracks the current min m0, 2nd choice m1 and 3rd choice m2
        this.mh = {
            m0: {tm: +t, val: +v},
            m1: {tm: +t, val: +v},
            m2: {tm: +t, val: +v}
        };
    }
    setWindow(win) { this.win = win; }
    //returns last/current min
    // might want to return undefined if current min outside win
    currentMin() { return this.mh.m0.val; }

    //set all the min history values to this measurement
    setAll(t, v) {
        Object.assign(this.mh.m0, {tm: +t, val: +v});
        Object.assign(this.mh.m1, {tm: +t, val: +v});
        Object.assign(this.mh.m2, {tm: +t, val: +v});
    }

    //update with a new measurement of value v at time t
    //  and return the min over the current time window
    update(t, v) {
        //for gap in updates greater than the window or for a new
        //  min, forget earlier history and reset to current value
        if (t - this.mh.m2.t > this.win || +v - this.mh.m0.val <= 0) {
            // big gap in time - we have nothing in the window
            this.setAll(t, v);
            return v;
        }

        // check if new measurement updates the 1st, 2nd or 3rd choice min
        let m0 = this.mh.m0;
        let m1 = this.mh.m1;
        let m2 = this.mh.m2;
        if (+v - m1.val <= 0) {
            Object.assign(m1, {tm: +t, val: +v});
            Object.assign(m2, {tm: +t, val: +v});
        } else if (+v - m2.val <= 0) {
            Object.assign(m2, {tm: +t, val: +v});
        }

        let dt = +t - m0.tm;
        if (dt > this.win) {
            /* passed entire window without a new min so make 2nd
                choice the new min & 3rd choice the new 2nd choice.
                we may have to iterate this since our 2nd choice
                may also be outside the window (we checked that the
                third choice was in the window on entry)
            */
            Object.assign(m0, m1);
            Object.assign(m1, m2);
            Object.assign(m2, {tm: +t, val: +v});
            if (+t - m0.tm > this.win) {
                Object.assign(m0, m1);
                Object.assign(m1, m2);
                Object.assign(m2, {tm: +t, val: +v});
            }
        } else if (m1.tm === m0.tm && dt > this.win/4.) {
            // passed a quarter of the window without a new min
            // so take a 2nd choice from the 2nd quarter of the window.
            Object.assign(m1, {tm: +t, val: +v});
            Object.assign(m2, {tm: +t, val: +v});
        } else if (m2.tm === m1.tm && dt > this.win/2.) {
            // passed half the window without finding a new min
            // so take a 3rd choice from the last half of the window
            Object.assign(m2, {tm: +t, val: +v});
        }

        return m0.val;
    }
};
