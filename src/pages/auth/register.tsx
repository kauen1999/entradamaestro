
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/modules/auth/schemas/register.schema";
import { trpc } from "@/utils/trpc";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });
  const mutation = trpc.auth.register.useMutation({
    onSuccess: () => router.push("/events"),
    onError: (err) => console.error(err.message),
  });

  const onSubmit = (data: RegisterInput) => mutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Name</label>
        <input {...register("name")} />
        {errors.name && <span>{errors.name.message}</span>}
      </div>
      <div>
        <label>Email</label>
        <input {...register("email")} type="email" />
        {errors.email && <span>{errors.email.message}</span>}
      </div>
      <div>
        <label>Password</label>
        <input {...register("password")} type="password" />
        {errors.password && <span>{errors.password.message}</span>}
      </div>
      <div>
        <label>Confirm Password</label>
        <input {...register("confirmPassword")} type="password" />
        {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}
      </div>
      <button type="submit">Register</button>
    </form>
  );
}
