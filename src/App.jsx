import { useState } from 'react'
import { questions, categoriesInfo } from './data'
import { jsPDF } from 'jspdf'
import emailjs from 'emailjs-com'
import logoUIS from './assets/Logotipo_UIS.png'

// Inicializar EmailJS con tu Public Key
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY)

function App() {
  const [view, setView] = useState('login') // 'login', 'quiz', 'thank-you', 'admin'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [userData, setUserData] = useState({ name: '', code: '', email: '' })
  const [isSending, setIsSending] = useState(false)
  const [loginMode, setLoginMode] = useState('student') // 'student' o 'admin'
  const [adminPassword, setAdminPassword] = useState('')
  const ADMIN_PASSWORD = 'admin123' // Cambia esto por una contraseña más segura

  const handleLogin = (e) => {
    e.preventDefault()
    
    if (loginMode === 'student') {
      if (userData.code && userData.email) {
        setView('quiz')
      }
    } else {
      // Login de admin
      if (adminPassword === ADMIN_PASSWORD) {
        setView('admin')
      } else {
        alert('Contraseña de administrador incorrecta')
      }
    }
  }

  const saveAnswersToStorage = (userAnswers, userInfo) => {
    const allResponses = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')
    const timestamp = new Date().toLocaleString()
    const results = calculateResults(userAnswers)
    
    // Calcular la categoría predominante
    const topCategory = Object.keys(results.averages).reduce((a, b) => 
      parseFloat(results.averages[a]) > parseFloat(results.averages[b]) ? a : b, 'A')
    const topCategoryTitle = categoriesInfo[topCategory].title
    
    const newResponse = {
      id: Date.now(),
      timestamp,
      code: userInfo.code,
      email: userInfo.email,
      answers: userAnswers,
      ...results,
      rolEstudiante: topCategoryTitle,
      topCategory: topCategory
    }
    
    allResponses.push(newResponse)
    localStorage.setItem('questionnaire_responses', JSON.stringify(allResponses))
  }

  const calculateResults = (answersObj = answers) => {
    const totals = { A: 0, B: 0, C: 0, D: 0 }
    const counts = { A: 0, B: 0, C: 0, D: 0 }

    questions.forEach(q => {
      if (answersObj[q.id]) {
        const score5 = Math.ceil(answersObj[q.id] / 2)
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
      // Guardar respuestas en localStorage antes de mostrar agradecimiento
      saveAnswersToStorage(answers, userData)
      setView('thank-you')
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    } else {
      setView('login')
    }
  }

  // VIEWS
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 shadow-2xl rounded-xl overflow-hidden border border-primary/10">
          <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-primary text-lg font-bold leading-tight tracking-tight flex-1 text-center">UIS</h2>
          </div>
          <div className="w-full aspect-square bg-primary/5 flex items-center justify-center p-8">
            <img src={logoUIS} alt="Logo UIS" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="px-8 pt-8 pb-4">
            <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold text-center">Inicio de Sesión</h1>
            <p className="text-slate-500 text-sm text-center mt-2">Cuestionario de Estilos de Pensamiento</p>
          </div>

          {/* Selector de tipo de usuario */}
          <div className="px-8 pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLoginMode('student')}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${loginMode === 'student' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                Estudiante
              </button>
              <button
                type="button"
                onClick={() => setLoginMode('admin')}
                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${loginMode === 'admin' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
              >
                Administrador
              </button>
            </div>
          </div>

          <form className="px-8 pb-10 space-y-6 pt-6" onSubmit={handleLogin}>
            {loginMode === 'student' ? (
              <>
                <div className="flex flex-col gap-3">
                  <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Código estudiantil</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl"></span>
                    <input 
                      className="w-full pl-14 pr-4 py-4 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all"
                      placeholder="Codigo: ejemplo 2224654"
                      type="text"
                      required
                      value={userData.code}
                      onChange={(e) => setUserData({ ...userData, code: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Correo institucional</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl"></span>
                    <input 
                      className="w-full pl-14 pr-4 py-4 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all"
                      placeholder="Ejemplo: nombre@correo.uis.edu.co"
                      type="email"
                      required
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Contraseña de Administrador</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
                  <input 
                    className="w-full pl-14 pr-4 py-4 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all"
                    placeholder="Ingrese la contraseña"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>
            )}
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
            <button onClick={prevQuestion} className="text-red-600 flex size-12 items-center justify-center hover:bg-red-50 rounded-full transition-colors font-bold text-sm">
              Salir
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

  if (view === 'thank-you') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-primary/10">
            <div className="bg-primary/10 p-12 flex flex-col items-center justify-center">
              <div className="bg-primary/20 p-6 rounded-full mb-6">
                <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-primary text-center mb-4">¡Gracias!</h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 text-center mb-2">Hemos registrado tu participación</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-6 border border-primary/20">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-center">
                  Agradecemos sinceramente tu participación en nuestro cuestionario de evaluación de estilos de pensamiento. 
                  Tu aporte es fundamental para mejorar continuamente nuestros sistemas de identificación y desarrollo de habilidades cognitivas.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 space-y-3">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Información de tu evaluación:</p>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400">Código:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{userData.code}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-600 dark:text-slate-400">Correo:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{userData.email}</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
                  Los resultados de tu evaluación serán analizados por nuestro equipo especializado en sistemas de pensamiento, 
                  con el objetivo de proporcionarte retroalimentación personalizada que contribuya a tu desarrollo académico y profesional.
                </p>
              </div>

              <button 
                onClick={() => { setView('login'); setAnswers({}); setCurrentQuestionIndex(0); setUserData({ name: '', code: '', email: '' }); }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all"
              >
                Volver al Inicio
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-8">
            Sistema de Evaluación de Estilos de Pensamiento © 2024 - Universidad Industrial de Santander
          </p>
        </div>
      </div>
    )
  }

  // VISTA ADMINISTRADOR
  if (view === 'admin') {
    const allResponses = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')

    const downloadCSV = () => {
      let csv = 'Fecha,Código,Correo,Rol Estudiante,A (Clarificador),B (Ideador),C (Desarrollador),D (Implementador)\\n'
      allResponses.forEach(response => {
        const { timestamp, code, email, rolEstudiante, averages } = response
        csv += `"${timestamp}","${code}","${email}","${rolEstudiante}",${averages.A},${averages.B},${averages.C},${averages.D}\\n`
      })
      
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
      element.setAttribute('download', `respuestas_${new Date().toISOString().split('T')[0]}.csv`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
    }

    const deleteAllResponses = () => {
      if (confirm('¿Está seguro de que desea eliminar TODAS las respuestas? Esta acción no se puede deshacer.')) {
        localStorage.setItem('questionnaire_responses', '[]')
        window.location.reload()
      }
    }

    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border-b border-primary/10 sticky top-0 z-10">
          <h2 className="text-lg font-bold">Panel de Administrador</h2>
          <button
            onClick={() => { setView('login'); setAdminPassword(''); }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Cerrar Sesión
          </button>
        </header>

        <main className="max-w-6xl mx-auto p-6">
          <section className="bg-white dark:bg-slate-900 rounded-xl p-6 mb-6 border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">Respuestas Guardadas</h3>
                <p className="text-slate-600 dark:text-slate-400">Total de respuestas: <strong>{allResponses.length}</strong></p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadCSV}
                  disabled={allResponses.length === 0}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${allResponses.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                >
                  📥 Descargar CSV
                </button>
                <button
                  onClick={deleteAllResponses}
                  disabled={allResponses.length === 0}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${allResponses.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                >
                  🗑️ Eliminar Todo
                </button>
              </div>
            </div>

            {allResponses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-lg">No hay respuestas registradas aún.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-primary">
                      <th className="text-left py-3 px-4 font-bold text-primary">Fecha</th>
                      <th className="text-left py-3 px-4 font-bold text-primary">Código</th>
                      <th className="text-left py-3 px-4 font-bold text-primary">Correo</th>
                      <th className="text-center py-3 px-4 font-bold text-primary">Rol Estudiante</th>
                      <th className="text-center py-3 px-4 font-bold text-primary">Clarificador (A)</th>
                      <th className="text-center py-3 px-4 font-bold text-primary">Ideador (B)</th>
                      <th className="text-center py-3 px-4 font-bold text-primary">Desarrollador (C)</th>
                      <th className="text-center py-3 px-4 font-bold text-primary">Implementador (D)</th>
                      <th className="text-center py-3 px-4 font-bold text-primary">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResponses.map((response, index) => (
                      <tr key={response.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <td className="py-3 px-4">{response.timestamp}</td>
                        <td className="py-3 px-4 font-semibold">{response.code}</td>
                        <td className="py-3 px-4">{response.email}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full font-semibold">
                            {response.rolEstudiante}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-semibold">
                            {response.averages.A}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full font-semibold">
                            {response.averages.B}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full font-semibold">
                            {response.averages.C}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full font-semibold">
                            {response.averages.D}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              const allResp = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')
                              const filtered = allResp.filter(r => r.id !== response.id)
                              localStorage.setItem('questionnaire_responses', JSON.stringify(filtered))
                              window.location.reload()
                            }}
                            className="text-red-600 hover:text-red-800 font-semibold transition-colors"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {allResponses.length > 0 && (
            <section className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold mb-4">Estadísticas Generales</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(categoriesInfo).map(([key, data]) => {
                  const avgScore = (
                    allResponses.reduce((sum, r) => sum + parseFloat(r.averages[key]), 0) / allResponses.length
                  ).toFixed(2)
                  return (
                    <div key={key} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{data.title}</p>
                      <p className="text-3xl font-bold text-primary">{avgScore}</p>
                      <p className="text-xs text-slate-500 mt-1">Promedio de {allResponses.length} estudiantes</p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    )
  }
}

export default App
