import React, { useState } from "react";
import { useRouter } from "next/router";
import { EventMap } from "../../BuyBody/EventMap";
import { eventMaps } from "../../../data/maps";
import { trpc } from "@/utils/trpc";
import type { EventMapConfig } from "@/data/maps";

interface Props {
  event: {
    id: string;
    name: string;
    date: string;
    image: string | null;
    city: string;
    venueName: string;
    sessions: {
      id: string;
      date: string;
      venueName: string;
    }[];
    ticketCategories: {
      id: string;
      title: string;
      price: number;
      seats: {
        id: string;
        label: string;
        row: string | null;
        number: number | null;
        status: "AVAILABLE" | "RESERVED" | "SOLD";
      }[];
    }[];
    category: {
      id: string;
      name: string;
    };
  };
}

type Seat = {
  sector: string;
  row: string;
  seat: number;
  price: number;
};

// Utilitário para mesclar mapa estático com preços reais do banco
const mergeMapWithTicketPrices = (
  mapConfig: EventMapConfig,
  ticketCategories: Props["event"]["ticketCategories"]
): EventMapConfig => {
  const newSectors = mapConfig.sectors.map((sector) => {
    const ticketCategory = ticketCategories.find(
      (tc) => tc.title.toLowerCase() === sector.name.toLowerCase()
    );
    const price = ticketCategory?.price ?? 0;

    const newPricesByRow = Object.fromEntries(
      sector.rows.map((row) => [row, price])
    );

    return {
      ...sector,
      pricesByRow: newPricesByRow,
    };
  });

  return {
    ...mapConfig,
    sectors: newSectors,
  };
};

const BuyBody: React.FC<Props> = ({ event }) => {
  const router = useRouter();
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSelect = (sector: string, row: string, seat: number, price: number) => {
    const isAlreadySelected = selectedSeats.some(
      (s) => s.sector === sector && s.row === row && s.seat === seat
    );

    if (isAlreadySelected) {
      setSelectedSeats((prev) =>
        prev.filter((s) => !(s.sector === sector && s.row === row && s.seat === seat))
      );
    } else {
      if (selectedSeats.length >= 5) return;
      setSelectedSeats((prev) => [...prev, { sector, row, seat, price }]);
    }
  };

  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);
  const totalTickets = selectedSeats.length;
  const disabled = totalTickets === 0;

  const staticMap = eventMaps["belgrano"];
  if (!staticMap) {
    return (
      <div className="flex h-64 items-center justify-center">
        <span className="text-gray-500">Mapa do evento não encontrado.</span>
      </div>
    );
  }

  const mapConfig = mergeMapWithTicketPrices(staticMap, event.ticketCategories);

  const createOrder = trpc.order.create.useMutation({
    onSuccess: (order) => {
      router.push(`/checkout/${order.id}`);
    },
    onError: (error) => {
      console.error("💥 Erro ao criar pedido:", error);
      alert("Um ou mais assentos não estão mais disponíveis.");
    },
  });

  const handleBuy = () => {
    if (!termsAccepted || selectedSeats.length === 0) {
      alert("Você precisa aceitar os termos e selecionar pelo menos um ingresso.");
      return;
    }

    const sessionId = event.sessions?.[0]?.id;
    if (!sessionId) {
      alert("Sessão do evento não encontrada.");
      return;
    }

    const selectedLabels = selectedSeats.map((s) => `${s.row}-${s.seat}`);

    createOrder.mutate({
      eventId: event.id,
      sessionId,
      selectedLabels,
    });
  };

  return (
    <div className="mx-auto my-4 flex max-w-[1200px] flex-col gap-8 rounded-lg border border-gray-300 bg-white p-6 shadow-lg lg:flex-row">
      <div className="flex w-full items-center justify-center lg:w-1/2">
        <EventMap
          mapConfig={mapConfig}
          onSelect={handleSelect}
          selectedSeats={selectedSeats}
          maxReached={selectedSeats.length >= 5}
          blockedSeats={event.ticketCategories.flatMap((cat) =>
            cat.seats
              .filter((s) => s.status === "SOLD" || s.status === "RESERVED")
              .map((s) => ({
                sector: cat.title,
                row: s.row ?? "",
                seat: s.number ?? 0,
              }))
          )}
        />
      </div>

      <div className="w-full lg:w-1/2">
        <h2 className="w-fit rounded bg-gray-400 px-4 py-2 text-sm font-bold text-white">
          DOM-06/JUL
        </h2>

        {selectedSeats.length > 0 ? (
          <div className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-2">
            {selectedSeats.map((s, i) => (
              <div key={i} className="border-b pb-2">
                <div className="flex items-center justify-between">
                  <p>Setor: {s.sector}</p>
                  <p>Assento: {s.row}-{s.seat}</p>
                </div>
                <p>Preço: ${s.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Nenhum assento selecionado.</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-600">
              Aceito os termos e condições
            </label>
          </div>
          <button
            disabled={disabled || !termsAccepted}
            onClick={handleBuy}
            className="w-full rounded bg-primary-100 py-2 font-bold text-white hover:bg-primary-200 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Comprar ahora ({totalTickets} ingresso{totalTickets > 1 ? "s" : ""}) - ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyBody;
