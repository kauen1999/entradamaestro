
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/modules/auth/schemas/login.schema";
import { trpc } from "@/utils/trpc";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  const mutation = trpc.auth.login.useMutation({
    onSuccess: () => router.push("/events"),
    onError: (err) => console.error(err.message),
  });

  const onSubmit = (data: LoginInput) => mutation.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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
      <button type="submit">Login</button>
    </form>
  );
}
