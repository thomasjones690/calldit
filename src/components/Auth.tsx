'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase/client'

export function AuthComponent() {
  const navigate = useNavigate()

  useEffect(() => {
    // Listen for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/predictions')
      }
    })

    // Check if user is already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/predictions')
      }
    })
  }, [navigate])

  return (
    <div className="max-w-md mx-auto p-4">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: '#404040',
                brandAccent: '#2d2d2d',
              },
            },
          },
          style: {
            button: { background: '#404040', color: 'white' },
            anchor: { color: '#404040' },
          },
        }}
        providers={['google']}
        redirectTo={`${window.location.origin}/predictions`}
        magicLink={true}
        onlyThirdPartyProviders={false}
        localization={{
          variables: {
            sign_in: {
              email_label: 'Email',
              password_label: 'Password',
              button_label: 'Sign In',
            },
          },
        }}
      />
    </div>
  )
} 