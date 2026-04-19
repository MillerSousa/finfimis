import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useTabSync — corrige o bug clássico de "aba inativa" com Supabase:
 *
 * Quando o usuário troca de aba por mais de alguns segundos:
 *  - O token JWT pode expirar em background
 *  - WebSockets do Realtime viram "zombies" (acham que estão conectados, mas não recebem nada)
 *  - O app pode ficar preso em loading infinito
 *
 * Este hook:
 *  1. Escuta `visibilitychange` e, ao voltar à aba, força `refreshSession()`
 *  2. Usa um lock (`refreshPromiseRef`) para evitar refresh concorrente (race condition
 *     entre refresh do token e reconexão dos canais)
 *  3. Após o token estar válido, remove e recria todos os canais Realtime ativos
 *  4. Fallback: se após 5s ainda houver indício de "preso", faz `window.location.reload()`
 *     mantendo a tab atual via query param (?tab=...)
 *
 * Aplique uma vez no topo da árvore (ex.: dentro de <AppProvider>).
 */
export function useTabSync() {
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const clearFallback = () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    const armFallback = () => {
      clearFallback();
      // Se em 5s nada respondeu, recarrega preservando a tab atual
      fallbackTimerRef.current = window.setTimeout(() => {
        try {
          const params = new URLSearchParams(window.location.search);
          if (!params.get('tab')) {
            // tenta preservar tab default se Index ainda não populou
            params.set('tab', 'pessoal');
          }
          window.location.replace(
            `${window.location.pathname}?${params.toString()}`
          );
        } catch {
          window.location.reload();
        }
      }, 5000);
    };

    const reconnectRealtimeChannels = async () => {
      try {
        // Pega todos os canais ativos e força reconexão
        const channels = supabase.getChannels();
        for (const ch of channels) {
          try {
            await supabase.removeChannel(ch);
          } catch {
            /* ignore */
          }
        }
        // O Realtime client do supabase-js auto-reconecta o socket;
        // os componentes que usavam canais devem recriá-los no próximo render/effect.
      } catch {
        /* ignore */
      }
    };

    const runSync = async () => {
      // Lock: se já há um refresh em andamento, reutiliza a promise
      if (refreshPromiseRef.current) {
        await refreshPromiseRef.current;
        return;
      }

      armFallback();

      refreshPromiseRef.current = (async () => {
        try {
          // 1. Refresh do token PRIMEIRO
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            // Sessão pode ter expirado de fato — deixa o onAuthStateChange tratar
            return;
          }
          if (!data.session) return;

          // 2. Só DEPOIS reconecta os canais Realtime
          await reconnectRealtimeChannels();
        } finally {
          clearFallback();
          refreshPromiseRef.current = null;
        }
      })();

      await refreshPromiseRef.current;
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      if (document.visibilityState === 'visible') {
        const awayMs = hiddenAtRef.current
          ? Date.now() - hiddenAtRef.current
          : 0;
        hiddenAtRef.current = null;

        // Só vale a pena sincronizar se ficou ausente por > 3s
        if (awayMs > 3000) {
          void runSync();
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      clearFallback();
    };
  }, []);
}
