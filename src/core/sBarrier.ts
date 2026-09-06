import { NullUndefined, NumberLiteral } from './types';
import { assert } from './util';

/**
 * A simple barrier util to create a synchronization point where multiple parties must arrive before
 * execution continues. The behavior is similar to `Promise.all`, but conventionally echarts and zrender
 * has never used `Promise` directly due to the conservatism for platform-agnosticism (e.g., some platform
 * may not strictly implement `Promise` according to the spec). So we introduce this simple and
 * straightforward implementation.
 *
 * @example
 *  ```ts
 *  const MY_BARRIER_PARTY_EL_A = 0;
 *  const MY_BARRIER_PARTY_EL_B = 1;
 *  // If there are more parties, use 2, 3, 4, ...
 *  type MyBarrierArgs = [number, string]; // Argument types for the parties.
 *
 *  function renderA(barrier: SBarrier<MyBarrierArgs>) {
 *      sBarrierEnableParty(barrier, MY_BARRIER_PARTY_EL_A, true);
 *      createElA().animateTo({x: 100}, {
 *          duration: 500,
 *          force: true,
 *          during(percent) { sBarrierArrive(barrier, MY_BARRIER_PARTY_EL_A, 123); },
 *          done() { sBarrierEnableParty(barrier, MY_BARRIER_PARTY_EL_A, false); }
 *      });
 *  }
 *  function renderB(barrier: SBarrier<MyBarrierArgs>) {
 *      sBarrierEnableParty(barrier, MY_BARRIER_PARTY_EL_B, true);
 *      createElB().animateTo({x: 500}, {
 *          duration: 2000,
 *          force: true,
 *          during(percent) { sBarrierArrive(barrier, MY_BARRIER_PARTY_EL_B, 'abc'); }
 *          done() { sBarrierEnableParty(barrier, MY_BARRIER_PARTY_EL_B, false); }
 *      });
 *  }
 *  function render() {
 *      const barrier = sBarrierCreate<MyBarrierArgs>();
 *      if (satisfyConditionA()) { // Conditionally omit elA.
 *          renderA(barrier);
 *      }
 *      if (!satisfyConditionB()) { // Conditionally omit elB.
 *          renderB(barrier);
 *      }
 *      barrier.cb = function update_others_after_elA_or_elB_are_changed(args) {
 *          // args is [123, 'abc'] or [undefined, 'abc'] or [123, undefined]
 *      };
 *      // Then `update_others_after_elA_or_elB_being_changed` is called only once per
 *      // frame after `during`s of elA and elB being executed.
 *  }
 *  ```
 */
export type SBarrier<TArgs extends SBarrierArgsBase> = {
    // Subsequent handler.
    // The index of `args` is `partyIdx`.
    cb?: (args: TArgs) => void | NullUndefined;
};
type SBarrierArgsBase = unknown[];
type SBarrierInner<TArgs extends SBarrierArgsBase> = {
    c: number; /* Current */ t: number; /* Target */ args: TArgs;
} & SBarrier<TArgs>;

function sBarrierInner<TArgs extends SBarrierArgsBase>(val: SBarrier<TArgs>): SBarrierInner<TArgs> {
    return val as SBarrierInner<TArgs>; // This method can be inlined and eliminated by terser.
}

export function sBarrierCreate<TArgs extends SBarrierArgsBase = never>(): SBarrier<TArgs> {
    const barrier: SBarrierInner<TArgs> = {c: 0, t: 0, args: [] as TArgs};
    return barrier;
}

/**
 * Enable or disable a party dynamically.
 * Idempotent.
 *
 * NOTICE: When disabling, there is no automatic call to `cb`, otherwise idempotency
 * can not be guaranteed.
 * So `sBarrierArrive` should be explicitly called immediately before disabling,
 * otherwise a `cb` call is missing.
 *  ```ts
 *  // Sample 1:
 *  sBarrierArrive(barrier, partyIdx, args);
 *  sBarrierEnableParty(barrier, partyIdx, false);
 *  // Sample 2:
 *  el.animateTo(props, {
 *      during: function () { sBarrierArrive(barrier, partyIdx, args) },
 *      done: function () { sBarrierEnableParty(barrier, partyIdx, false); },
 *      duration: 200,
 *  });
 *  ```
 */
export function sBarrierEnableParty<TArgs extends SBarrierArgsBase, TPartyIdx extends number>(
    barrier: SBarrier<TArgs>, partyIdx: NumberLiteral<TPartyIdx>, enable: boolean
): void {
    if (process.env.NODE_ENV !== 'production') {
        checkPartyIdx(partyIdx);
    }
    sBarrierInner(barrier).args[partyIdx] = undefined;
    if (enable) {
        sBarrierInner(barrier).t |= (1 << partyIdx);
    }
    else { // Disable
        sBarrierInner(barrier).t &= ~(1 << partyIdx);
    }
}

export function sBarrierArrive<TArgs extends SBarrierArgsBase, TPartyIdx extends number>(
    barrier: SBarrier<TArgs>, partyIdx: NumberLiteral<TPartyIdx>, arg: TArgs[TPartyIdx]
): void {
    if (process.env.NODE_ENV !== 'production') {
        checkPartyIdx(partyIdx);
        assert((sBarrierInner(barrier).t & (1 << partyIdx)) > 0); // Check enabled.
    }
    sBarrierInner(barrier).c |= (1 << partyIdx);
    sBarrierInner(barrier).args[partyIdx] = arg;
    sBarrierTryCall(barrier);
}

function sBarrierTryCall<TArgs extends SBarrierArgsBase>(barrier: SBarrier<TArgs>): void {
    if (sBarrierInner(barrier).c === sBarrierInner(barrier).t) {
        const args = sBarrierInner(barrier).args.slice() as TArgs;
        // Reset before call `cb` in case of error thrown of `cb`.
        sBarrierInner(barrier).c = sBarrierInner(barrier).args.length = 0;
        barrier.cb && barrier.cb(args);
    }
}

function checkPartyIdx<TPartyIdx extends number>(partyIdx: NumberLiteral<TPartyIdx>): void {
    // JS bitwise op is limited to 32-bit, but suffice.
    assert(partyIdx >= 0 && partyIdx < 32);
}
