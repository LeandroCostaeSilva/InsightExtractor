import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { forgotPasswordSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import type { z } from "zod";

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send reset email");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsEmailSent(true);
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para instruções de recuperação.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar email de recuperação.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Email Enviado</CardTitle>
            <CardDescription className="text-slate-300">
              Se o email estiver cadastrado, você receberá instruções para redefinir sua senha em alguns minutos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-slate-300 space-y-2">
                <p>• Verifique sua caixa de entrada e spam</p>
                <p>• O link expira em 1 hora</p>
                <p>• Você pode solicitar um novo link se necessário</p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEmailSent(false);
                    form.reset();
                  }}
                  className="border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
                  data-testid="button-send-again"
                >
                  Enviar Novamente
                </Button>
                
                <Link href="/login">
                  <Button variant="ghost" className="w-full text-slate-300 hover:bg-slate-700 hover:text-white" data-testid="link-back-login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao Login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md bg-slate-800/90 backdrop-blur-sm border-slate-700 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">Recuperar Senha</CardTitle>
          <CardDescription className="text-slate-300">
            Digite seu email para receber instruções de recuperação de senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-200">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="seu@email.com"
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                disabled={forgotPasswordMutation.isPending}
                data-testid="button-submit"
              >
                {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar Email"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:bg-slate-700 hover:text-white" data-testid="link-back-login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}