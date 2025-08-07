// src/components/principal/eventos/EventoCard.tsx
import React from "react";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import { BiTimeFive } from "react-icons/bi";
import { CiLocationOn } from "react-icons/ci";
import Link from "next/link";

type Props = {
  slug: string; 
  artist: string;
  fecha: string;
  foto: string | StaticImageData;
  ubicacion: string;
  ciudad: string;
};

const EventoCard = ({ slug, artist, fecha, ubicacion, ciudad, foto }: Props) => {
  return (
    <article className="relative max-w-md rounded-xl overflow-hidden shadow-md">
      <Link href={`/eventdetail/${slug}`}>
        <Image
          src={foto}
          alt="Foto"
          width={500}
          height={500}
          className="w-full h-full object-cover rounded-xl"
        />

        <h3 className="2xl:text:2xl absolute top-5 left-5 text-2xl font-bold text-white lg:left-3 lg:text-xl">
          {artist}
        </h3>

        <div className="absolute bottom-5 left-5 flex flex-col gap-4 lg:left-2 lg:text-sm 2xl:text-base">
          <div className="flex items-center gap-1">
            <BiTimeFive className="text-2xl text-white" />
            <h5 className="font-bold text-white">{fecha}</h5>
          </div>

          <div className="flex items-center gap-1">
            <CiLocationOn className="text-2xl text-white" />
            <div>
              <h5 className="font-bold leading-none text-white">{ubicacion}</h5>
              <h5 className="text-white">{ciudad}</h5>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
};

export default EventoCard;
