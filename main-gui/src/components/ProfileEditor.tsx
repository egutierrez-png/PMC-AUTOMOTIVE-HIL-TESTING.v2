import { useEffect, useState, useMemo } from "react";
import { Panel } from "./Panel";
import { useProfilesStore } from "../state/useProfilesStore";
import { useToastStore } from "../store/useToastStore";

import ProfileSignalMapForm from "./ProfileSignalMapForm";
import CanFrameInspector from "./CanFrameInspector";
import { useSignalsStore } from "../state/useSignalsStore";

import type {
  CommProfile,
  ProtocolType,
  CanProfile,
  UartProfile,
  LinProfile,
} from "../types/Profile";

import ProfileMetaForm from "./ProfileMetaForm";
import ProfileCANForm from "./ProfileCANForm";
import ProfileUARTForm from "./ProfileUARTForm";
import ProfileLINForm from "./ProfileLINForm";

type Props = {
  profileId?: string | null;
  onClose?: () => void;
};

export default function ProfileEditor({ profileId, onClose }: Props) {
  const { profiles, selectedId, update } = useProfilesStore();
  const pushToast = useToastStore((s) => s.push);

  const effectiveId = profileId ?? selectedId;
  const selected = profiles.find((p) => p.id === effectiveId) as CommProfile | undefined;

  const [meta, setMeta] = useState<Partial<CommProfile>>({});
  const [body, setBody] = useState<any>({});

  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);
  const [offset, setOffset] = useState(0);
  const [len, setLen] = useState(1);

  // ============================================================
  // LOAD PROFILE
  // ============================================================
  useEffect(() => {
    if (!selected) {
      setMeta({});
      setBody({});
      return;
    }

    setMeta({
      id: selected.id,
      name: selected.name,
      schema: selected.schema,
      protocol: selected.protocol,
      revision: selected.revision,
      timestamp: selected.timestamp,
      defaults: selected.defaults,
      signalMap: selected.signalMap ?? [],
    });

    if (selected.signalMap) {
      const signalNames = selected.signalMap.map((sig) => sig.name);
      useSignalsStore.getState().setAvailableSignals(signalNames);
    }

    if (selected.protocol === "CAN") {
      const p = selected as CanProfile;
      setBody({ can: p.can });
    } else if (selected.protocol === "UART") {
      const p = selected as UartProfile;
      setBody({ uart: p.uart });
    } else if (selected.protocol === "LIN") {
      const p = selected as LinProfile;
      setBody({ lin: p.lin });
    }
  }, [effectiveId, selected]);

  // ============================================================
  // RESET BODY ON PROTOCOL CHANGE
  // ============================================================
  useEffect(() => {
    if (!meta.protocol) return;

    if (meta.protocol === "CAN" && !body.can) {
      setBody({ can: { bitrate: 250000, tx_id: "", rx_id: "", extended: true } });
    }
    if (meta.protocol === "UART" && !body.uart) {
      setBody({
        uart: {
          baudrate: 115200,
          databits: 8,
          parity: "none",
          stopbits: 1,
        },
      });
    }
    if (meta.protocol === "LIN" && !body.lin) {
      setBody({
        lin: {
          baudrate: 19200,
          master: true,
          frame_id: "0x10",
        },
      });
    }
  }, [meta.protocol]);

  // ============================================================
  // SYNC BACK TO STORE
  // ============================================================
  useEffect(() => {
    if (!selected || !meta.protocol) return;

    const next: CommProfile = {
      ...(selected as CommProfile),
      ...meta,
      ...body,
      timestamp: new Date().toISOString(),
    };

    const same = JSON.stringify(next) === JSON.stringify(selected);
    if (same) return;

    const t = setTimeout(() => {
      update(selected.id, next);
    }, 350);

    return () => clearTimeout(t);
  }, [meta, body, selected, update]);

  // ============================================================
  // PROTOCOL FORM SELECTOR
  // ============================================================
  const ProtocolForm = useMemo(() => {
    if (!meta.protocol) return null;

    switch (meta.protocol as ProtocolType) {
      case "CAN":
        return (
          <ProfileCANForm
            data={body.can ?? {}}
            onChange={(next) => setBody({ can: next })}
          />
        );
      case "UART":
        return (
          <ProfileUARTForm
            data={body.uart ?? {}}
            onChange={(next) => setBody({ uart: next })}
          />
        );
      case "LIN":
        return (
          <ProfileLINForm
            data={body.lin ?? {}}
            onChange={(next) => setBody({ lin: next })}
          />
        );
      default:
        return <div className="text-sm opacity-60">Protocolo inválido.</div>;
    }
  }, [meta.protocol, body]);

  const preview = useMemo(() => ({ ...meta, ...body }), [meta, body]);

  // ============================================================
  // NO PROFILE SELECTED
  // ============================================================
  if (!selected) {
    return (
      <Panel title="Editor de perfil">
        <div className="text-sm opacity-70">Selecciona un perfil para editarlo.</div>
      </Panel>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================
  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

      {/* META */}
      <Panel title="Metadatos" className="col-span-1">
        <ProfileMetaForm
          meta={meta}
          onChange={(next) => setMeta({ ...meta, ...next })}
        />
      </Panel>

      {/* PROTOCOL */}
      <Panel title={`Protocol: ${meta.protocol}`} className="col-span-1">
        {ProtocolForm}
      </Panel>

      {/* PREVIEW */}
      <Panel title="Vista previa y acciones" className="col-span-1">
        <pre
          className="
            bg-slate-200 text-slate-800 border border-slate-300 rounded p-3 text-xs overflow-auto max-h-64
            dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700
          "
        >
          {JSON.stringify(preview, null, 2)}
        </pre>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => {
              pushToast("Perfil guardado correctamente", "success");
              onClose?.();
            }}
            className="
              px-4 py-2 rounded font-bold
              bg-accent text-black
              hover:bg-yellow-300 transition
            "
          >
            Guardar
          </button>
        </div>
      </Panel>

      {/* SIGNAL MAP */}
      <Panel title="Mapa de señales" className="col-span-1 lg:col-span-3">
        <ProfileSignalMapForm
          signalMap={meta.signalMap ?? []}
          onChange={(map) => setMeta({ ...meta, signalMap: map })}
        />
      </Panel>

      {/* LIVE CAN INSPECTOR */}
      {meta.protocol === "CAN" && (
        <Panel title="🔍 Inspector CAN en vivo" className="col-span-1 lg:col-span-3">
          {selectedSignal ? (
            <CanFrameInspector
              byteOffset={offset}
              length={len}
              type={selectedSignal.type}
              scale={selectedSignal.scale}
              onSelect={(off, newLen) => {
                setOffset(off);
                setLen(newLen);
              }}
            />
          ) : (
            <div className="text-xs opacity-60">
              Selecciona una señal del mapa para inspeccionarla.
            </div>
          )}
        </Panel>
      )}

    </div>
  );
}
