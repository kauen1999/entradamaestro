// src/pages/event/create.tsx
import React, { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { EventStatus } from "@prisma/client";
import { trpc } from "@/utils/trpc";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

// Supabase client usando env validado sem non-null assertions
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FIXED_TICKET_TYPES = ["Platea A", "Platea B", "Platea C", "Pullman"] as const;
type FixedType = (typeof FIXED_TICKET_TYPES)[number];

const eventSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().min(1),
  street: z.string(),
  number: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  venueName: z.string(),
  image: z.string().optional(),
  categoryId: z.string().min(1),
  capacity: z.number().min(1).max(150),
  sessions: z.array(
    z.object({
      date: z.string().min(1),
      city: z.string().min(1),
      venueName: z.string().min(1),
    })
  ),
  ticketCategories: z.array(
    z.object({
      title: z.enum(FIXED_TICKET_TYPES),
      price: z.number().min(1),
      quantity: z.number().min(0),
    })
  ),
});

type EventFormInput = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [sessions, setSessions] = useState<EventFormInput["sessions"]>([
    { date: "", city: "", venueName: "" },
  ]);
  const [tickets, setTickets] = useState<EventFormInput["ticketCategories"]>([]);
  const [artistInput, setArtistInput] = useState("");
  const [artists, setArtists] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState("");

  const { data: categories = [] } = trpc.category.list.useQuery();
  const mutation = trpc.event.create.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  const { register, getValues } = useForm<
    Omit<EventFormInput, "sessions" | "ticketCategories" | "image">
  >({
    resolver: zodResolver(
      eventSchema.omit({ sessions: true, ticketCategories: true, image: true })
    ),
    mode: "onTouched",
  });

  const inputClass =
    "w-full rounded border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-200 placeholder-gray-400";

  const uploadImage = async (): Promise<string | undefined> => {
    if (!imageFile) return imagePreview ?? undefined;
    const fileName = `${Date.now()}-${imageFile.name}`;
    const { error } = await supabase.storage.from("entrad-maestro").upload(fileName, imageFile);
    if (error) throw error;
    return `${supabaseUrl}/storage/v1/object/public/entrad-maestro/${fileName}`;
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) return alert("Usuário não autenticado");
    if (!categoryId) return alert("Categoria obrigatória");
    if (!tickets.length) return alert("Adicione pelo menos um tipo de ingresso");

    const raw = getValues();
    let image: string | undefined;
    try {
      image = await uploadImage();
    } catch {
      alert("Erro ao subir imagem");
      return;
    }

    const payload: EventFormInput = {
      ...raw,
      categoryId,
      image,
      sessions,
      ticketCategories: tickets,
    };

    try {
      eventSchema.parse(payload);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("Erro de validação:", err.flatten());
        alert("Preencha todos os campos obrigatórios corretamente.");
      } else {
        console.error("Erro desconhecido:", err);
      }
      return;
    }

    mutation.mutate({
      ...payload,
      userId: session.user.id,
      status: EventStatus.OPEN,
      publishedAt: new Date(),
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-bold text-gray-800">Crear evento</h1>
      <form onSubmit={(e) => e.preventDefault()} className="space-y-10">
        {/* Informação básica */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Información básica</h2>
          <input {...register("name")} placeholder="Nombre del evento" className={inputClass} />
          <input {...register("description")} placeholder="Descripción" className={inputClass} />
          <input {...register("slug")} placeholder="Slug (URL amigável)" className={inputClass} />
        </div>

        {/* Informação do evento */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Información del evento</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={artistInput}
              onChange={(e) => setArtistInput(e.target.value)}
              placeholder="Nombre del artista"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={() => {
                if (!artistInput.trim()) return;
                setArtists((prev) => [...prev, artistInput.trim()]);
                setArtistInput("");
              }}
              className="hover:bg-primary-200 rounded bg-primary-100 px-4 py-2 text-white"
            >
              Agregar
            </button>
          </div>
          {artists.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {artists.map((name, i) => (
                <span key={i} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800">
                  {name}
                </span>
              ))}
            </div>
          )}
          <input {...register("venueName")} placeholder="Lugar do evento" className={inputClass} />
          <input
            {...register("capacity", { valueAsNumber: true })}
            type="number"
            placeholder="Capacidade (1 a 150)"
            className={inputClass}
          />
        </div>

        {/* Localização */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Localização</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input {...register("street")} placeholder="Rua" className={inputClass} />
            <input {...register("number")} placeholder="Número" className={inputClass} />
            <input {...register("neighborhood")} placeholder="Bairro" className={inputClass} />
            <input {...register("city")} placeholder="Cidade" className={inputClass} />
            <input {...register("state")} placeholder="Estado" className={inputClass} />
            <input {...register("zipCode")} placeholder="CEP" className={inputClass} />
          </div>
        </div>

        {/* Categoria */}
        <div className="space-y-4 rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Categoria</h2>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">Selecione uma categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title}
              </option>
            ))}
          </select>
        </div>

        {/* Imagem */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Imagem do evento</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }
            }}
            className={inputClass}
          />
          {imagePreview && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-500">Prévia da imagem:</p>
              <div className="relative h-64 w-full overflow-hidden rounded">
                <Image src={imagePreview} alt="Preview" fill className="object-cover" />
              </div>
            </div>
          )}
        </div>

        {/* Sessões */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Sessões</h2>
          {sessions.map((s, i) => (
            <div key={i} className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="date"
                value={s.date}
                onChange={(e) =>
                  setSessions((prev) =>
                    prev.map((sess, idx) => (idx === i ? { ...sess, date: e.target.value } : sess))
                  )
                }
                className={inputClass}
              />
              <input
                placeholder="Cidade"
                value={s.city}
                onChange={(e) =>
                  setSessions((prev) =>
                    prev.map((sess, idx) => (idx === i ? { ...sess, city: e.target.value } : sess))
                  )
                }
                className={inputClass}
              />
              <input
                placeholder="Local"
                value={s.venueName}
                onChange={(e) =>
                  setSessions((prev) =>
                    prev.map((sess, idx) =>
                      idx === i ? { ...sess, venueName: e.target.value } : sess
                    )
                  )
                }
                className={inputClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setSessions((prev) => [...prev, { date: "", city: "", venueName: "" }])
            }
            className="text-sm text-blue-600 underline"
          >
            + Adicionar sessão
          </button>
        </div>

        {/* Ingressos */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold text-gray-700">Ingressos</h2>
          {tickets.map((ticket, i) => (
            <div key={i} className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <select
                value={ticket.title}
                onChange={(e) =>
                  setTickets((prev) =>
                    prev.map((t, idx) => (idx === i ? { ...t, title: e.target.value as FixedType } : t))
                  )
                }
                className={inputClass}
              >
                {FIXED_TICKET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>  
                ))}
              </select>

              <input
                type="number"
                placeholder="Quantidade"
                value={ticket.quantity}
                onChange={(e) =>
                  setTickets((prev) =>
                    prev.map((t, idx) => (idx === i ? { ...t, quantity: Math.max(0, Number(e.target.value)) } : t))
                  )
                }
                className={inputClass}
              />

              <input
                type="number"
                placeholder="Preço"
                value={ticket.price}
                onChange={(e) =>
                  setTickets((prev) =>
                    prev.map((t, idx) => (idx === i ? { ...t, price: Number(e.target.value) || 0 } : t))
                  )
                }
                className={inputClass}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setTickets((prev) => [...prev, { title: "Platea A", price: 1, quantity: 1 }])}
            className="text-sm text-blue-600 underline"
          >
            + Adicionar ingresso
          </button>
        </div>

        {/* Botão de criar */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            className="hover:bg-primary-200 rounded bg-primary-100 px-6 py-3 font-semibold text-white transition"
          >
            Criar Evento
          </button>
        </div>
      </form>
    </div>
  );
}
