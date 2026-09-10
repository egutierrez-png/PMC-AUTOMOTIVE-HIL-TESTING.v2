import { create } from "zustand";

type ConfigState = {
  brokerUrl: string;
  stationId: string;
  setBrokerUrl: (url: string) => void;
  setStationId: (id: string) => void;
  loadFromStorage: () => void;
};

export const useConfigStore = create<ConfigState>((set) => ({
  brokerUrl: "ws://localhost:9001",
  stationId: "EOL01",

  setBrokerUrl: (url) => {
    set({ brokerUrl: url });
    localStorage.setItem("brokerUrl", url);
  },

  setStationId: (id) => {
    set({ stationId: id });
    localStorage.setItem("stationId", id);
  },

  loadFromStorage: () => {
    const broker = localStorage.getItem("brokerUrl");
    const station = localStorage.getItem("stationId");
    if (broker) set({ brokerUrl: broker });
    if (station) set({ stationId: station });
  },
}));
