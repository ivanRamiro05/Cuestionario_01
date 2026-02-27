import { useState } from 'react'
import { questions, categoriesInfo } from './data'
import { jsPDF } from 'jspdf'
import emailjs from 'emailjs-com'
import logoUIS from './assets/Logotipo_UIS.png'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Pie, Doughnut } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

// Inicializar EmailJS con tu Public Key
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY)

function App() {
  const [view, setView] = useState('login') // 'login', 'quiz', 'thank-you', 'admin'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [userData, setUserData] = useState({ name: '', code: '', email: '', password: '' })
  const [isSending, setIsSending] = useState(false)
  const [numCuestionarios, setNumCuestionarios] = useState('')
  const [refreshData, setRefreshData] = useState(0) // Para forzar actualización de datos
  const [showAllResponses, setShowAllResponses] = useState(false) // Para controlar vista de todas las respuestas
  
  // Credenciales de administrador
  const ADMIN_EMAIL = 'admin@uis.edu.co'
  const ADMIN_PASSWORD = 'admin123'

  const handleLogin = (e) => {
    e.preventDefault()
    
    // Verificar si son credenciales de administrador
    if (userData.email === ADMIN_EMAIL && userData.password === ADMIN_PASSWORD) {
      setView('admin')
    } else if (userData.email && userData.password) {
      // Credenciales de estudiante - continuar al cuestionario
      setView('quiz')
    } else {
      alert('Por favor complete todos los campos')
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
            <h1 className="text-slate-900 dark:text-slate-100 text-2xl font-bold text-center">Registro</h1>
            <p className="text-slate-500 text-sm text-center mt-2">Cuestionario de Estilos de Pensamiento</p>
          </div>

          <form className="px-8 pb-10 space-y-6 pt-6" onSubmit={handleLogin}>
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

            <div className="flex flex-col gap-3">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Contraseña</label>
              <div className="relative">
                <input 
                  className="w-full pl-14 pr-4 py-4 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all"
                  placeholder="Ingrese su contraseña"
                  type="password"
                  required
                  value={userData.password}
                  onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                />
              </div>
            </div>

            <button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-md transition-all active:scale-[0.98]" type="submit">
              Registrarse
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
        <div className="max-w-lg w-full">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-primary/10">
            <div className="bg-primary/10 p-16 flex flex-col items-center justify-center">
              <div className="bg-primary/20 p-6 rounded-full mb-6">
                <svg className="w-20 h-20 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-primary text-center mb-4">¡Gracias!</h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 text-center">
                Su evaluación ha sido registrada exitosamente
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-6 border border-primary/20">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-center text-base">
                  Agradecemos su participación en nuestro sistema de evaluación de estilos de pensamiento. 
                  Sus respuestas han sido almacenadas de manera segura para su posterior análisis.
                </p>
              </div>

              <button 
                onClick={() => { setView('login'); setAnswers({}); setCurrentQuestionIndex(0); setUserData({ name: '', code: '', email: '', password: '' }); }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                Finalizar
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-6">
            Universidad Industrial de Santander
          </p>
        </div>
      </div>
    )
  }

  // VISTA ADMINISTRADOR
  if (view === 'admin') {
    const allResponses = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')

    // Función para generar cuestionarios aleatorios
    const generateRandomQuestionnaires = (count) => {
      const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Sofia', 'Pedro', 'Laura', 'Diego', 'Carolina']
      const apellidos = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores']
      const dominios = ['correo.uis.edu.co', 'uis.edu.co', 'outlook.uis.edu.co']
      
      const newResponses = []
      const existingResponses = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')
      
      for (let i = 0; i < count; i++) {
        const nombre = nombres[Math.floor(Math.random() * nombres.length)]
        const apellido = apellidos[Math.floor(Math.random() * apellidos.length)]
        const codigo = `22${Math.floor(10000 + Math.random() * 90000)}`
        const email = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${Math.floor(Math.random() * 100)}@${dominios[Math.floor(Math.random() * dominios.length)]}`
        
        // Generar respuestas aleatorias para todas las preguntas
        const randomAnswers = {}
        questions.forEach(q => {
          randomAnswers[q.id] = Math.floor(Math.random() * 10) + 1
        })
        
        // Calcular resultados
        const results = calculateResults(randomAnswers)
        const topCategory = Object.keys(results.averages).reduce((a, b) => 
          parseFloat(results.averages[a]) > parseFloat(results.averages[b]) ? a : b, 'A')
        const topCategoryTitle = categoriesInfo[topCategory].title
        
        const newResponse = {
          id: Date.now() + i,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleString(),
          code: codigo,
          email: email,
          answers: randomAnswers,
          averages: results.averages,
          rolEstudiante: topCategoryTitle,
          topCategory: topCategory
        }
        
        newResponses.push(newResponse)
      }
      
      const allData = [...existingResponses, ...newResponses]
      localStorage.setItem('questionnaire_responses', JSON.stringify(allData))
      setRefreshData(prev => prev + 1) // Forzar actualización en lugar de recargar
      setNumCuestionarios('') // Limpiar el input
      setShowAllResponses(false) // Volver a mostrar solo las primeras 10
      alert(`✅ Se generaron ${count} cuestionarios exitosamente`)
    }

    const handleGenerateQuestionnaires = () => {
      const count = parseInt(numCuestionarios)
      if (isNaN(count) || count <= 0 || count > 1000) {
        alert('Por favor ingrese un número válido entre 1 y 1000')
        return
      }
      if (confirm(`¿Está seguro de generar ${count} cuestionarios aleatorios?`)) {
        generateRandomQuestionnaires(count)
      }
    }

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
        setRefreshData(prev => prev + 1)
        setShowAllResponses(false)
      }
    }

    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border-b border-primary/10 sticky top-0 z-10">
          <h2 className="text-lg font-bold">Panel de Administrador</h2>
          <button
            onClick={() => { setView('login'); setUserData({ name: '', code: '', email: '', password: '' }); }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Cerrar Sesión
          </button>
        </header>

        <main className="max-w-6xl mx-auto p-6">
          {/* Sección de generación de cuestionarios */}
          <section className="bg-white dark:bg-slate-900 rounded-xl p-6 mb-6 border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-bold mb-4">🔧 Generador de Cuestionarios Aleatorios</h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2 block">Cantidad de cuestionarios a generar</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={numCuestionarios}
                  onChange={(e) => setNumCuestionarios(e.target.value)}
                  placeholder="Ejemplo: 500"
                  className="w-full px-4 py-3 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all"
                />
              </div>
              <button
                onClick={handleGenerateQuestionnaires}
                disabled={!numCuestionarios}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${!numCuestionarios ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                ⚡ Generar Datos
              </button>
            </div>
            <p className="text-slate-500 text-sm mt-3">Genera cuestionarios con datos aleatorios para análisis y pruebas. Los datos incluyen usuarios, correos y respuestas variadas.</p>
          </section>

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
              <>
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
                      {(showAllResponses ? allResponses : allResponses.slice(0, 10)).map((response, index) => (
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
                                setRefreshData(prev => prev + 1)
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

                {/* Botón para mostrar/ocultar todas las respuestas */}
                {allResponses.length > 10 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowAllResponses(!showAllResponses)}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                    >
                      {showAllResponses ? (
                        <>📌    Reducir    </>
                      ) : (
                        <>📋 Mostrar todas las respuestas ({allResponses.length})</>
                      )}
                    </button>
                    <p className="text-slate-500 text-sm mt-2">
                      {showAllResponses 
                        ? `Mostrando todas las ${allResponses.length} respuestas`
                        : `Mostrando 10 de ${allResponses.length} respuestas`
                      }
                    </p>
                  </div>
                )}
              </>
            )}
          </section>

          {allResponses.length > 0 && (
            <>
              <section className="bg-white dark:bg-slate-900 rounded-xl p-6 mb-6 border border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold mb-4">📊 Estadísticas Generales</h3>
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

              {/* Sección de Gráficos Avanzados */}
              <section className="bg-white dark:bg-slate-900 rounded-xl p-6 mb-6 border border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold mb-6">📈 Visualizaciones y Análisis</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Gráfico de Torta - Distribución de Roles */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4 text-center">Distribución de Perfiles de Estudiantes</h4>
                    <div className="h-[300px] flex items-center justify-center">
                      <Pie
                        data={{
                          labels: Object.values(categoriesInfo).map(c => c.title),
                          datasets: [{
                            data: Object.keys(categoriesInfo).map(key => 
                              allResponses.filter(r => r.topCategory === key).length
                            ),
                            backgroundColor: [
                              'rgba(59, 130, 246, 0.8)',
                              'rgba(168, 85, 247, 0.8)',
                              'rgba(34, 197, 94, 0.8)',
                              'rgba(249, 115, 22, 0.8)'
                            ],
                            borderColor: [
                              'rgba(59, 130, 246, 1)',
                              'rgba(168, 85, 247, 1)',
                              'rgba(34, 197, 94, 1)',
                              'rgba(249, 115, 22, 1)'
                            ],
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                color: '#64748b',
                                font: { size: 12 }
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const label = context.label || '';
                                  const value = context.parsed || 0;
                                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                  const percentage = ((value / total) * 100).toFixed(1);
                                  return `${label}: ${value} (${percentage}%)`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Gráfico de Barras - Promedios por Categoría */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold mb-4 text-center">Promedio de Puntuaciones por Categoría</h4>
                    <div className="h-[300px]">
                      <Bar
                        data={{
                          labels: Object.values(categoriesInfo).map(c => c.title),
                          datasets: [{
                            label: 'Puntuación Promedio',
                            data: Object.keys(categoriesInfo).map(key => (
                              allResponses.reduce((sum, r) => sum + parseFloat(r.averages[key]), 0) / allResponses.length
                            ).toFixed(2)),
                            backgroundColor: [
                              'rgba(59, 130, 246, 0.7)',
                              'rgba(168, 85, 247, 0.7)',
                              'rgba(34, 197, 94, 0.7)',
                              'rgba(249, 115, 22, 0.7)'
                            ],
                            borderColor: [
                              'rgba(59, 130, 246, 1)',
                              'rgba(168, 85, 247, 1)',
                              'rgba(34, 197, 94, 1)',
                              'rgba(249, 115, 22, 1)'
                            ],
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 5,
                              ticks: { color: '#64748b' },
                              grid: { color: 'rgba(148, 163, 184, 0.1)' }
                            },
                            x: {
                              ticks: { color: '#64748b' },
                              grid: { display: false }
                            }
                          },
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  return `Promedio: ${context.parsed.y}`;
                                }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Gráfico de Rosquilla - Distribución Detallada */}
                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg">
                  <h4 className="text-lg font-semibold mb-4 text-center">Análisis de Composición de Perfiles</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-[300px] flex items-center justify-center">
                      <Doughnut
                        data={{
                          labels: Object.values(categoriesInfo).map(c => c.title),
                          datasets: [{
                            data: Object.keys(categoriesInfo).map(key => 
                              allResponses.filter(r => r.topCategory === key).length
                            ),
                            backgroundColor: [
                              'rgba(59, 130, 246, 0.8)',
                              'rgba(168, 85, 247, 0.8)',
                              'rgba(34, 197, 94, 0.8)',
                              'rgba(249, 115, 22, 0.8)'
                            ],
                            borderColor: '#ffffff',
                            borderWidth: 3
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                color: '#64748b',
                                font: { size: 12 }
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <h5 className="font-semibold mb-4 text-slate-700 dark:text-slate-300">Recomendaciones para Formación de Grupos:</h5>
                      <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                        <li className="flex items-start">
                          <span className="text-blue-500 mr-2">●</span>
                          <span><strong>Clarificadores:</strong> Ideales para definir objetivos y analizar problemas complejos.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-purple-500 mr-2">●</span>
                          <span><strong>Ideadores:</strong> Aportan creatividad e ideas innovadoras al equipo.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">●</span>
                          <span><strong>Desarrolladores:</strong> Refinan y mejoran las soluciones propuestas.</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-2">●</span>
                          <span><strong>Implementadores:</strong> Ejecutan y concretan las ideas en proyectos reales.</span>
                        </li>
                      </ul>
                      <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <p className="text-sm text-indigo-900 dark:text-indigo-200">
                          <strong>💡 Consejo:</strong> Los equipos más efectivos combinan diferentes perfiles para aprovechar fortalezas complementarias.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    )
  }
}

export default App
