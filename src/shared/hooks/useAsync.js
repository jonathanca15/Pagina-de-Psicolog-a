import { useCallback, useEffect, useReducer, useRef } from 'react';

/**
 * @typedef {'idle' | 'loading' | 'success' | 'error'} AsyncStatus
 */

/**
 * @template T
 * @typedef {Object} AsyncState
 * @property {AsyncStatus} status
 * @property {T} data
 * @property {Error | null} error
 */

/**
 * @template T
 * @typedef {{ ok: true, data: T } | { ok: false, error: Error, aborted?: false } | { ok: false, aborted: true }} AsyncResult
 */

const ACTIONS = Object.freeze({
  START: 'start',
  RESOLVE: 'resolve',
  REJECT: 'reject',
  SET_DATA: 'set_data',
  RESET: 'reset',
});

function asyncReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START:
      return { ...state, status: 'loading', error: null };
    case ACTIONS.RESOLVE:
      return { status: 'success', data: action.data, error: null };
    case ACTIONS.REJECT:
      return { ...state, status: 'error', error: action.error };
    case ACTIONS.SET_DATA:
      return {
        ...state,
        data: typeof action.updater === 'function' ? action.updater(state.data) : action.updater,
      };
    case ACTIONS.RESET:
      return action.initialState;
    default:
      return state;
  }
}

/**
 * Máquina de estados genérica para operaciones asíncronas (idle → loading → success | error).
 *
 * - Cancela automáticamente la operación anterior al lanzar una nueva (evita race conditions).
 * - Cancela al desmontar el componente (evita setState sobre componentes desmontados).
 * - `run` NUNCA lanza: devuelve un AsyncResult discriminado, así los llamadores no
 *   necesitan try/catch y no hay promesas rechazadas sin manejar.
 *
 * No depende del dominio ni del storage: solo de AbortController estándar.
 *
 * @template T
 * @param {T} initialData
 */
export function useAsync(initialData) {
  const initialStateRef = useRef({ status: 'idle', data: initialData, error: null });
  const [state, dispatch] = useReducer(asyncReducer, initialStateRef.current);
  const controllerRef = useRef(/** @type {AbortController | null} */ (null));

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  /**
   * @param {(signal: AbortSignal) => Promise<T>} asyncFn
   * @returns {Promise<AsyncResult<T>>}
   */
  const run = useCallback(async (asyncFn) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({ type: ACTIONS.START });

    try {
      const data = await asyncFn(controller.signal);
      if (controller.signal.aborted) return { ok: false, aborted: true };
      dispatch({ type: ACTIONS.RESOLVE, data });
      return { ok: true, data };
    } catch (error) {
      if (controller.signal.aborted) return { ok: false, aborted: true };
      dispatch({ type: ACTIONS.REJECT, error });
      return { ok: false, error };
    }
  }, []);

  /** Actualiza `data` localmente (p. ej. inserción optimista tras crear un registro). */
  const setData = useCallback((updater) => {
    dispatch({ type: ACTIONS.SET_DATA, updater });
  }, []);

  /** Cancela lo pendiente y vuelve al estado inicial. */
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    dispatch({ type: ACTIONS.RESET, initialState: initialStateRef.current });
  }, []);

  return {
    ...state,
    isIdle: state.status === 'idle',
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    run,
    setData,
    reset,
  };
}
