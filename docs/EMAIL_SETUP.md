# Email Setup — Cantivo

## Template de Email de Bem-vindo

O template de email está localizado em `src/lib/email-templates.ts` e é compatível com **Resend**.

### Características

- ✨ Design responsivo e moderno
- 🎨 Alinhado à identidade visual Cantivo (cores violeta e âmbar)
- 👤 Personalizado com o nome do usuário
- 📱 Otimizado para mobile
- 🔗 CTA claro para começar a usar

### Como usar com Resend

#### 1. Instalar Resend

```bash
npm install resend
```

#### 2. Adicionar env var

```env
RESEND_API_KEY=your_resend_api_key
```

#### 3. Usar o template

```typescript
import { Resend } from 'resend';
import { welcomeEmailHtml } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  confirmUrl?: string
) {
  try {
    await resend.emails.send({
      from: 'Cantivo <onboarding@cantivo.app.br>',
      to: userEmail,
      subject: 'Bem-vindo ao Cantivo! 🎉',
      html: welcomeEmailHtml(userName, confirmUrl),
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
  }
}
```

#### 4. Integrar com Auth (Supabase)

Se estiver usando Supabase Auth com Resend, configure em seu hook de auth:

```typescript
import { sendWelcomeEmail } from '@/lib/email';

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_UP' && session?.user) {
    sendWelcomeEmail(
      session.user.email!,
      session.user.user_metadata?.name || session.user.email!.split('@')[0]
    );
  }
});
```

### Personalizações

#### Mudar o "De"

```typescript
from: 'Nome <seu-email@dominio.com>'
```

#### Mudar o assunto

```typescript
subject: 'Seu assunto aqui'
```

#### Adicionar URL de confirmação

```typescript
welcomeEmailHtml(userName, 'https://cantivo.app.br/confirm?token=xyz')
```

#### Mudar o emoji do logo

Em `src/lib/email-templates.ts`, linha 105:
```html
<div class="logo-icon">✨</div>  <!-- Mude o ✨ para outro emoji -->
```

### Preview

Para testar o email antes de enviar:
1. Acesse [Resend Dashboard](https://resend.com)
2. Vá em "Emails" → "Previews"
3. Cole o HTML do template

Ou use uma ferramenta como [Email on Acid](https://www.emailonacid.com/) para verificar compatibilidade com clientes.

---

**Nota**: Certifique-se de que o domínio `onboarding@cantivo.app.br` está verificado no Resend.
