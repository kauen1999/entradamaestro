
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { completeProfileSchema, CompleteProfileInput } from "@/modules/auth/schemas/completeProfile.schema";
import { trpc } from "@/utils/trpc";
import { useRouter } from "next/router";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
  });
  const mutation = trpc.auth.completeProfile.useMutation({
    onSuccess: () => router.push("/events"),
    onError: (err) => console.error(err.message),
  });

  const onSubmit = (data: CompleteProfileInput) => mutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Full Name</label>
        <input {...register("dniName")} />
        {errors.dniName && <span>{errors.dniName.message}</span>}
      </div>
      <div>
        <label>DNI</label>
        <input {...register("dni")} />
        {errors.dni && <span>{errors.dni.message}</span>}
      </div>
      <div>
        <label>Phone</label>
        <input {...register("phone")} />
        {errors.phone && <span>{errors.phone.message}</span>}
      </div>
      <div>
        <label>Birthdate</label>
        <input {...register("birthdate")} type="date" />
        {errors.birthdate && <span>{errors.birthdate.message}</span>}
      </div>
      <button type="submit">Complete Profile</button>
    </form>
  );
}
