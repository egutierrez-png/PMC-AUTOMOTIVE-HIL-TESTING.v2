import type { SignalDefinition } from "../components/signals/registry/type";
export type ProtocolType = "CAN" | "UART" | "LIN";

/**
 * Base profile shared by all protocols.
 */
export interface BaseProfile {
  id: string;
  name: string;
  schema: "pmc.can.profile/1" | "pmc.uart.profile/1" | "pmc.lin.profile/1";
  protocol: ProtocolType;
  revision: number;
  timestamp: string;
  signalMap?: SignalDefinition[];  // <- nueva propiedad
  defaults: {
    timeout_ms: number;
  };
}

/** CAN profile */
export interface CanProfile extends BaseProfile {
  can: {
    bitrate: number;
    tx_id: string;
    rx_id: string;
    extended: boolean;
  };
}

/** UART profile */
export interface UartProfile extends BaseProfile {
  uart: {
    baudrate: number;
    databits: 7 | 8;
    parity: "none" | "even" | "odd";
    stopbits: 1 | 2;
  };
}

/** LIN profile */
export interface LinProfile extends BaseProfile {
  lin: {
    baudrate: number;
    master: boolean;
    frame_id: string;
  };
}

/** Union of all profiles */
export type CommProfile = CanProfile | UartProfile | LinProfile;
