import { useState } from 'react'
import { questions, categoriesInfo } from './data'
import { jsPDF } from 'jspdf'
import emailjs from 'emailjs-com'

// Inicializar EmailJS con tu Public Key
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY)

function App() {
  const [view, setView] = useState('login') // 'login', 'quiz', 'results'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [userData, setUserData] = useState({ name: '', code: '', email: '' })
  const [isSending, setIsSending] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    if (userData.code && userData.email) {
      setView('quiz')
    }
  }

  const handleScoreChange = (score) => {
    const qId = questions[currentQuestionIndex].id
    setAnswers(prev => ({
      ...prev,
      [qId]: score
    }))
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      setView('results')
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    } else {
      setView('login')
    }
  }

  const calculateResults = () => {
    const totals = { A: 0, B: 0, C: 0, D: 0 }
    const counts = { A: 0, B: 0, C: 0, D: 0 }

    questions.forEach(q => {
      if (answers[q.id]) {
        const score5 = Math.ceil(answers[q.id] / 2)
        totals[q.category] += score5
        counts[q.category] += 1
      }
    })

    const averages = {}
    Object.keys(totals).forEach(cat => {
      averages[cat] = counts[cat] > 0 ? (totals[cat] / counts[cat]).toFixed(1) : 0
    })

    return { averages }
  }

  const results = calculateResults()
  const topCategory = Object.keys(results.averages).reduce((a, b) => 
    parseFloat(results.averages[a]) > parseFloat(results.averages[b]) ? a : b, 'A')

  // VIEWS
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 shadow-2xl rounded-xl overflow-hidden border border-primary/10">
          <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-primary text-lg font-bold leading-tight tracking-tight flex-1 text-center">UIS</h2>
          </div>
          <div className="w-full aspect-video bg-primary/5 flex items-center justify-center p-8">
            <div className="w-full h-full bg-center bg-no-repeat bg-contain" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBzSw6hnjCouJSaVvHuvXbbAro9CoqdPWHLD_p6CYj8316Qs5EFaJDkLJNhQ2UlI7tLGDufOYK4u_v5gm617dZGKsftmG1Wpxy2Xo687S2ZqD9D07MyWeneHn_-Z-95z8zwV6Y-w1FfUE7ReuIjmS-GKxIk_UxEoojdfq432yF14GUw2w4Lp5WZnC2MTL0lnm692wNJ7E64TwcP4r2crV-YPNTz8R08nyWw82qNhrzpOzTpk5nAnhC4inhUAa8l0BYt6YjxflkmVtA")' }}></div>
          </div>
          <div className="px-8 pt-8 pb-4">
            <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold text-center">Inicio de Sesión</h1>
            <p className="text-slate-500 text-sm text-center mt-2">Cuestionario de Estilos de Pensamiento</p>
          </div>
          <form className="px-8 pb-10 space-y-5" onSubmit={handleLogin}>
            <div className="flex flex-col gap-2">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Código estudiantil</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</span>
                <input 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="ej. 2224654"
                  type="text"
                  required
                  value={userData.code}
                  onChange={(e) => setUserData({ ...userData, code: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Correo institucional</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                <input 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="ej. nombre@correo.uis.edu.co"
                  type="email"
                  required
                  value={userData.email}
                  onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                />
              </div>
            </div>
            <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-md transition-all active:scale-[0.98]" type="submit">
              Ingresar
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (view === 'quiz') {
    const q = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100

    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 flex flex-col items-center">
        <div className="relative flex min-h-screen w-full flex-col max-w-md bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">
          <div className="flex items-center p-4 pb-2 justify-between border-b border-primary/10">
            <button onClick={prevQuestion} className="text-primary flex size-12 items-center justify-center hover:bg-primary/5 rounded-full transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold flex-1 text-center pr-12">Cuestionario UIS</h2>
          </div>

          <div className="flex flex-col gap-3 p-6">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-primary text-xs font-bold uppercase tracking-wider mb-1">Paso Actual</p>
                <p className="text-base font-medium">Progreso de la encuesta</p>
              </div>
              <p className="text-primary text-sm font-bold">{currentQuestionIndex + 1} de {questions.length}</p>
            </div>
            <div className="rounded-full bg-primary/10 h-3 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className="flex-1 px-6 py-8 flex flex-col items-center justify-center text-center">
            <div className="bg-primary/5 p-4 rounded-full mb-6">
              <span className="material-symbols-outlined text-primary text-4xl">Cuestionario CIDI</span>
            </div>
            <h3 className="tracking-tight text-2xl font-bold leading-tight pb-4">{q.text}</h3>
            
            <div className="w-full mt-8">
              <div className="flex flex-col items-center gap-8">
                <div className="flex w-full items-center justify-between px-2">
                  <span className="text-xs font-semibold text-slate-400">Poco</span>
                  <div className="text-primary text-4xl font-black bg-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                    {answers[q.id] || '-'}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Mucho</span>
                </div>

                <div className="grid grid-cols-5 gap-2 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <button
                      key={num}
                      onClick={() => handleScoreChange(num)}
                      className={`h-12 rounded-lg font-bold transition-all ${answers[q.id] === num ? 'bg-primary text-white scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100">
            <button 
              onClick={nextQuestion}
              disabled={!answers[q.id]}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${answers[q.id] ? 'bg-primary text-white shadow-primary/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {currentQuestionIndex === questions.length - 1 ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'results') {
    const info = categoriesInfo[topCategory]
    const mainScore = results.averages[topCategory]

    const handleSendEmail = async () => {
      setIsSending(true)
      
      try {
        // 1. Generar el PDF
        const doc = new jsPDF()
        doc.setFontSize(22)
        doc.setTextColor(0, 102, 54) // Verde UIS
        doc.text('Resultados del Cuestionario de Estilos de Pensamiento', 10, 20)
        
        doc.setFontSize(14)
        doc.setTextColor(0, 0, 0)
        doc.text(`Estudiante: ${userData.code}`, 10, 40)
        doc.text(`Correo: ${userData.email}`, 10, 50)
        doc.text(`Perfil Predominante: ${info.title}`, 10, 70)
        
        doc.setFontSize(12)
        const splitDescription = doc.splitTextToSize(info.description, 180)
        doc.text(splitDescription, 10, 80)
        
        doc.text('Resultados por Categoría:', 10, 110)
        let y = 120
        Object.entries(categoriesInfo).forEach(([key, data]) => {
          doc.text(`${data.title}: ${results.averages[key]} / 5.0`, 15, y)
          y += 10
        })

        // Convertir PDF a string base64 para enviarlo o descargarlo
        // Nota: EmailJS free tiene limitaciones para adjuntos, usualmente se envía el link o el resumen en texto.
        // Aquí enviamos los datos como parámetros del template de EmailJS.
        
        const templateParams = {
          to_email: userData.email,
          user_code: userData.code,
          top_category: info.title,
          description: info.description,
          score_a: results.averages.A,
          score_b: results.averages.B,
          score_c: results.averages.C,
          score_d: results.averages.D,
          // Este es el PDF en base64 por si quieres configurarlo como adjunto en EmailJS
          content: doc.output('datauristring').split(',')[1] 
        }

        const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
        const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID

        if (!SERVICE_ID || !TEMPLATE_ID) {
          alert('Por favor, configura las variables de entorno VITE_EMAILJS_SERVICE_ID y VITE_EMAILJS_TEMPLATE_ID')
          // Descargamos el PDF como alternativa si no hay config
          doc.save(`Resultados_UIS_${userData.code}.pdf`)
        } else {
          await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams)
          alert(`¡Éxito! Se han enviado los resultados a ${userData.email}`)
        }

      } catch (error) {
        console.error('Error al enviar:', error)
        alert(`Error al enviar: ${error?.text || error?.message || 'Error desconocido'}. Revisa que el ID del Servicio y de la Plantilla coincidan en tu panel de EmailJS.`)
      } finally {
        setIsSending(false)
      }
    }

    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 flex flex-col">
        <header className="flex items-center bg-white dark:bg-background-dark/50 p-4 border-b border-primary/10 sticky top-0 z-10 justify-center">
          <h2 className="text-lg font-bold">Resultados de Evaluación</h2>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full pb-24">
          <section className="p-6 flex flex-col items-center">
            <div className="relative flex items-center justify-center mb-6">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle className="text-primary/10" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
                <circle 
                  className="text-primary" 
                  cx="96" cy="96" fill="transparent" r="88" 
                  stroke="currentColor" strokeWidth="12" 
                  strokeDasharray="552.92" 
                  strokeDashoffset={552.92 - (552.92 * mainScore / 5)} 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold text-primary">{mainScore}</span>
                <span className="text-sm font-medium text-slate-500 uppercase tracking-widest">de 5.0</span>
              </div>
            </div>
            <div className="bg-primary/5 dark:bg-primary/20 rounded-xl p-4 w-full text-center border border-primary/10">
              <p className="text-primary font-bold text-lg mb-1">Tu Estilo Predominante</p>
              <p className="text-slate-600 dark:text-slate-300">Has sido identificado como un <strong>{info.title}</strong></p>
            </div>
          </section>

          <section className="px-6 py-4">
            <div className="bg-white dark:bg-slate-900/50 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-primary"></span>
                </div>
                <h3 className="text-xl font-bold">Perfil del Pensador</h3>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{info.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(categoriesInfo).map(([key, data]) => (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{data.title}</span>
                      <span className="text-primary font-bold">{results.averages[key]}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${(results.averages[key] / 5) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 py-8 flex flex-col gap-3">
            <button 
              onClick={handleSendEmail}
              disabled={isSending}
              className={`bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all ${isSending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/90'}`}
            >
              <span className="material-symbols-outlined">{isSending ? 'sync' : 'picture_as_pdf'}</span>
              {isSending ? 'Enviando...' : 'Enviar Resultados por Correo (PDF)'}
            </button>
            
            <button 
              onClick={() => { setView('login'); setAnswers({}); setCurrentQuestionIndex(0); setUserData({ name: '', code: '', email: '' }); }}
              className="bg-slate-100 text-slate-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              Cerrar Sesión
            </button>
          </section>
        </main>
      </div>
    )
  }
}

export default App
