import { useState, useEffect } from 'react'
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
  const [view, setView] = useState('login') // 'login', 'instructions', 'quiz', 'thank-you', 'admin'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [userData, setUserData] = useState({ name: '', code: '' })
  const [exampleAnswer, setExampleAnswer] = useState(null) // Para la pregunta de ejemplo
  const [isSending, setIsSending] = useState(false)
  const [numCuestionarios, setNumCuestionarios] = useState('')
  const [refreshData, setRefreshData] = useState(0) // Para forzar actualización de datos
  const [showAllResponses, setShowAllResponses] = useState(false) // Para controlar vista de todas las respuestas
  const [expandedTeam, setExpandedTeam] = useState(null) // Para controlar qué equipo está expandido
  const [generatedTeams, setGeneratedTeams] = useState([]) // Para almacenar equipos generados
  
  // Credenciales de administrador
  const ADMIN_NAME = 'Ivan Suarez'
  const ADMIN_CODE = '2224654'

  const handleLogin = (e) => {
    e.preventDefault()
    
    // Verificar si son credenciales de administrador
    if (userData.name === ADMIN_NAME && userData.code === ADMIN_CODE) {
      setView('admin')
    } else if (userData.name && userData.code) {
      // Credenciales de estudiante - verificar si el código ya existe
      const allResponses = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')
      const existingResponse = allResponses.find(r => r.code === userData.code)
      
      if (existingResponse) {
        // El usuario ya tiene una encuesta registrada
        const confirm = window.confirm(
          `Ya existe una encuesta registrada con el código ${userData.code} del ${existingResponse.timestamp}.\n\n` +
          `¿Desea actualizar su encuesta anterior?\n\n` +
          `Si acepta, se eliminará su encuesta anterior y podrá realizar una nueva.`
        )
        
        if (confirm) {
          // Eliminar la encuesta anterior
          const filteredResponses = allResponses.filter(r => r.code !== userData.code)
          localStorage.setItem('questionnaire_responses', JSON.stringify(filteredResponses))
          setView('instructions')
        } else {
          // No permitir continuar
          alert('No se puede continuar con el mismo código. Por favor use otro código o acepte actualizar su encuesta.')
          return
        }
      } else {
        // Código nuevo, continuar a las instrucciones
        setView('instructions')
      }
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
    
    // Generar email basado en el código para compatibilidad con el resto del sistema
    const generatedEmail = `estudiante${userInfo.code}@uis.edu.co`
    
    const newResponse = {
      id: Date.now(),
      timestamp,
      name: userInfo.name,
      code: userInfo.code,
      email: generatedEmail,
      answers: userAnswers,
      ...results,
      rolEstudiante: topCategoryTitle,
      topCategory: topCategory
    }
    
    // Eliminar cualquier respuesta anterior con el mismo código (seguridad adicional)
    const filteredResponses = allResponses.filter(r => r.code !== userInfo.code)
    
    // Agregar la nueva respuesta
    filteredResponses.push(newResponse)
    localStorage.setItem('questionnaire_responses', JSON.stringify(filteredResponses))
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

  // Manejar eventos de teclado para la vista de instrucciones
  useEffect(() => {
    if (view !== 'instructions') return

    const handleKeyPress = (e) => {
      // Números 1-9
      if (e.key >= '1' && e.key <= '9') {
        const score = parseInt(e.key)
        setExampleAnswer(score)
      }
      // Número 0 representa 10
      else if (e.key === '0') {
        setExampleAnswer(10)
      }
      // Enter para comenzar el cuestionario
      else if (e.key === 'Enter') {
        setView('quiz')
        setExampleAnswer(null)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [view])

  // Manejar eventos de teclado para el cuestionario
  useEffect(() => {
    if (view !== 'quiz') return

    const handleKeyPress = (e) => {
      const q = questions[currentQuestionIndex]
      
      // Números 1-9
      if (e.key >= '1' && e.key <= '9') {
        const score = parseInt(e.key)
        handleScoreChange(score)
      }
      // Número 0 representa 10
      else if (e.key === '0') {
        handleScoreChange(10)
      }
      // Enter para siguiente pregunta
      else if (e.key === 'Enter' && answers[q.id]) {
        nextQuestion()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [view, currentQuestionIndex, answers])

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
              <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Nombre completo</label>
              <div className="relative">
                <input 
                  className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all"
                  placeholder="Ejemplo: Juan Pérez"
                  type="text"
                  required
                  value={userData.name}
                  onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Código estudiantil</label>
              <div className="relative">
                <input 
                  className="w-full px-4 py-4 text-base rounded-lg border-2 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:border-primary focus:ring-0 outline-none transition-all"
                  placeholder="Ejemplo: 2212345"
                  type="text"
                  required
                  value={userData.code}
                  onChange={(e) => setUserData({ ...userData, code: e.target.value })}
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

  if (view === 'instructions') {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 flex flex-col items-center">
        <div className="relative flex min-h-screen w-full flex-col max-w-md bg-white dark:bg-slate-900 shadow-xl overflow-x-hidden">
          <div className="flex items-center p-4 pb-2 justify-between border-b border-primary/10">
            <button onClick={() => { setView('login'); setUserData({ name: '', code: '' }); }} className="text-red-600 flex size-12 items-center justify-center hover:bg-red-50 rounded-full transition-colors font-bold text-sm">
              Atrás
            </button>
            <h2 className="text-lg font-bold flex-1 text-center pr-12">Instrucciones</h2>
          </div>

          <div className="flex-1 px-6 py-8 flex flex-col justify-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-3">📋 Cómo responder el cuestionario</h3>
              <p className="text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                A continuación se le presentarán una serie de afirmaciones. Deberá calificar cada una en una escala del <strong>1 al 10</strong>:
              </p>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">1 = No se acerca nada a mí</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-400">10 = Muy parecido a mí</span>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-6 mb-6">
              <h4 className="text-lg font-bold text-primary mb-4">Ejemplo de pregunta:</h4>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 mb-6 shadow-md">
                <p className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-6 text-center leading-relaxed">
                  "Generalmente no me acerco a los problemas de forma creativa."
                </p>
                
                <div className="flex w-full items-center justify-between px-2 mb-6">
                  <span className="text-xs font-semibold text-slate-400">Poco</span>
                  <div className="text-primary text-4xl font-black bg-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-primary/20">
                    {exampleAnswer || '-'}
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Mucho</span>
                </div>

                <div className="grid grid-cols-5 gap-2 w-full">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <button
                      key={num}
                      onClick={() => setExampleAnswer(num)}
                      className={`h-12 rounded-lg font-bold transition-all ${exampleAnswer === num ? 'bg-primary text-white scale-105' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-bold text-green-900 dark:text-green-100 mb-2">💡 Formas de responder:</h5>
                <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li className="flex items-start">
                    <span className="mr-2">🖱️</span>
                    <span><strong>Con el mouse:</strong> Haz clic en el número que mejor represente tu respuesta</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">⌨️</span>
                    <span><strong>Con el teclado:</strong> Presiona las teclas 1-9 o 0 (para 10), luego presiona <kbd className="bg-white dark:bg-slate-700 px-2 py-1 rounded border">Enter</kbd> para continuar</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100">
            <button 
              onClick={() => { setView('quiz'); setExampleAnswer(null); }}
              className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all bg-primary text-white shadow-primary/20 hover:bg-primary/90"
            >
              Comenzar Cuestionario
            </button>
          </div>
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
                onClick={() => { setView('login'); setAnswers({}); setCurrentQuestionIndex(0); setUserData({ name: '', code: '' }); }}
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
      
      const newResponses = []
      const existingResponses = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')
      const existingCodes = new Set(existingResponses.map(r => r.code))
      
      for (let i = 0; i < count; i++) {
        const nombre = nombres[Math.floor(Math.random() * nombres.length)]
        const apellido = apellidos[Math.floor(Math.random() * apellidos.length)]
        const nombreCompleto = `${nombre} ${apellido}`
        
        // Generar código único
        let codigo
        let attempts = 0
        do {
          codigo = `22${Math.floor(10000 + Math.random() * 90000)}`
          attempts++
        } while (existingCodes.has(codigo) && attempts < 100)
        
        // Agregar el código al set para evitar duplicados en el mismo lote
        existingCodes.add(codigo)
        
        // Generar email para compatibilidad con el resto del sistema
        const generatedEmail = `estudiante${codigo}@uis.edu.co`
        
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
          name: nombreCompleto,
          code: codigo,
          email: generatedEmail,
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
      let csv = 'Fecha,Código,Nombre,Rol Estudiante,A (Clarificador),B (Ideador),C (Desarrollador),D (Implementador)\n'
      allResponses.forEach(response => {
        const { timestamp, code, name, rolEstudiante, averages } = response
        csv += `"${timestamp}","${code}","${name || ''}","${rolEstudiante}",${averages.A},${averages.B},${averages.C},${averages.D}\n`
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

    const generateTeams = () => {
      // Agrupar estudiantes por categoría
      const byCategory = { A: [], B: [], C: [], D: [] }
      
      allResponses.forEach(response => {
        const category = response.topCategory
        if (category && byCategory[category]) {
          byCategory[category].push(response)
        }
      })

      // Determinar cuántos equipos se pueden formar
      const minCount = Math.min(
        byCategory.A.length,
        byCategory.B.length,
        byCategory.C.length,
        byCategory.D.length
      )

      if (minCount === 0) {
        alert('No hay suficientes estudiantes en todas las categorías para formar equipos balanceados.\n\nSe necesita al menos un estudiante de cada categoría (Clarificador, Ideador, Desarrollador, Implementador).')
        return []
      }

      // Mezclar los arrays para asignación aleatoria
      const shuffle = (array) => {
        const shuffled = [...array]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        return shuffled
      }

      const shuffledA = shuffle(byCategory.A)
      const shuffledB = shuffle(byCategory.B)
      const shuffledC = shuffle(byCategory.C)
      const shuffledD = shuffle(byCategory.D)

      // Crear equipos
      const teams = []
      for (let i = 0; i < minCount; i++) {
        teams.push({
          id: i + 1,
          name: `Equipo ${String.fromCharCode(65 + i)}`, // A, B, C, ...
          members: [
            shuffledA[i],
            shuffledB[i],
            shuffledC[i],
            shuffledD[i]
          ]
        })
      }

      // Informar sobre estudiantes no asignados
      const unassigned = {
        A: byCategory.A.length - minCount,
        B: byCategory.B.length - minCount,
        C: byCategory.C.length - minCount,
        D: byCategory.D.length - minCount
      }

      const totalUnassigned = unassigned.A + unassigned.B + unassigned.C + unassigned.D

      let message = `✅ Se formaron ${teams.length} equipos balanceados (4 integrantes cada uno).`
      
      if (totalUnassigned > 0) {
        message += `\n\n⚠️ ${totalUnassigned} estudiante(s) no se pudieron asignar por falta de balance:`
        if (unassigned.A > 0) message += `\n- ${unassigned.A} Clarificador(es)`
        if (unassigned.B > 0) message += `\n- ${unassigned.B} Ideador(es)`
        if (unassigned.C > 0) message += `\n- ${unassigned.C} Desarrollador(es)`
        if (unassigned.D > 0) message += `\n- ${unassigned.D} Implementador(es)`
      }

      alert(message)
      setGeneratedTeams(teams)
      setExpandedTeam(null)
      return teams
    }

    const deleteTeam = (teamId) => {
      if (confirm('¿Está seguro de que desea eliminar este equipo?')) {
        setGeneratedTeams(prev => prev.filter(team => team.id !== teamId))
        setExpandedTeam(null)
      }
    }

    const deleteAllTeams = () => {
      if (confirm('¿Está seguro de que desea eliminar TODOS los equipos? Esta acción no se puede deshacer.')) {
        setGeneratedTeams([])
        setExpandedTeam(null)
      }
    }

    const getUnassignedStudents = () => {
      // Obtener IDs de todos los estudiantes asignados a equipos
      const assignedIds = new Set()
      generatedTeams.forEach(team => {
        team.members.forEach(member => {
          assignedIds.add(member.id)
        })
      })

      // Filtrar estudiantes no asignados
      return allResponses.filter(response => !assignedIds.has(response.id))
    }

    const addMemberToTeam = (teamId, responseId) => {
      const studentToAdd = allResponses.find(r => r.id === responseId)
      if (!studentToAdd) return

      setGeneratedTeams(prev => prev.map(team => {
        if (team.id === teamId) {
          return {
            ...team,
            members: [...team.members, studentToAdd]
          }
        }
        return team
      }))
    }

    const removeMemberFromTeam = (teamId, memberId) => {
      if (confirm('¿Está seguro de que desea quitar este participante del equipo?')) {
        setGeneratedTeams(prev => prev.map(team => {
          if (team.id === teamId) {
            return {
              ...team,
              members: team.members.filter(member => member.id !== memberId)
            }
          }
          return team
        }))
      }
    }

    const importCSV = (event) => {
      const file = event.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const lines = text.split('\n').filter(line => line.trim() !== '')
          
          console.log('Total de líneas:', lines.length)
          console.log('Primera línea (encabezado):', lines[0])
          
          // Saltar la primera línea (encabezados)
          const dataLines = lines.slice(1)
          
          const existingResponses = JSON.parse(localStorage.getItem('questionnaire_responses') || '[]')
          let importedCount = 0
          let skippedCount = 0
          let errorCount = 0
          
          dataLines.forEach((line, index) => {
            try {
              // Parsear CSV respetando comillas
              const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
              const values = line.split(regex).map(v => v.replace(/^"|"$/g, '').trim())
              
              console.log(`Línea ${index + 2}:`, values.length, 'columnas')
              
              if (values.length >= 8) {
                const [timestamp, code, name, rolEstudiante, clarificador, ideador, desarrollador, implementador] = values
                
                // Validar que tenga código
                if (!code || code === '') {
                  console.log(`Línea ${index + 2}: Código vacío, omitiendo`)
                  errorCount++
                  return
                }
                
                // Validar que el código no exista
                const codeExists = existingResponses.some(r => r.code === code)
                if (codeExists) {
                  console.log(`Línea ${index + 2}: Código duplicado (${code}), omitiendo`)
                  skippedCount++
                  return
                }
                
                // Determinar topCategory del rolEstudiante
                let topCategory = 'A'
                if (rolEstudiante.includes('Clarificador')) topCategory = 'A'
                else if (rolEstudiante.includes('Ideador')) topCategory = 'B'
                else if (rolEstudiante.includes('Desarrollador')) topCategory = 'C'
                else if (rolEstudiante.includes('Implementador')) topCategory = 'D'
                
                // Generar email para compatibilidad con el resto del sistema
                const generatedEmail = `estudiante${code}@uis.edu.co`
                
                // Crear objeto de respuesta
                const newResponse = {
                  id: Date.now() + importedCount * 10,
                  timestamp: timestamp || new Date().toLocaleString(),
                  code: code || '',
                  name: name || '',
                  email: generatedEmail,
                  answers: {}, // No tenemos las respuestas detalladas del CSV
                  averages: {
                    A: parseFloat(clarificador) || 0,
                    B: parseFloat(ideador) || 0,
                    C: parseFloat(desarrollador) || 0,
                    D: parseFloat(implementador) || 0
                  },
                  rolEstudiante: rolEstudiante || '',
                  topCategory: topCategory
                }
                
                existingResponses.push(newResponse)
                importedCount++
              } else {
                console.log(`Línea ${index + 2}: Formato inválido (${values.length} columnas, se esperan 8)`)
                errorCount++
              }
            } catch (lineError) {
              console.error(`Error en línea ${index + 2}:`, lineError)
              errorCount++
            }
          })
          
          if (importedCount > 0) {
            localStorage.setItem('questionnaire_responses', JSON.stringify(existingResponses))
            setRefreshData(prev => prev + 1)
            setShowAllResponses(false)
            
            let message = `✅ Se importaron ${importedCount} registros exitosamente.`
            if (skippedCount > 0) message += `\n⚠️ Se omitieron ${skippedCount} registros con códigos duplicados.`
            if (errorCount > 0) message += `\n⚠️ ${errorCount} líneas con errores de formato.`
            
            alert(message)
          } else {
            let errorMsg = '❌ No se importaron registros.'
            if (errorCount > 0) errorMsg += `\n${errorCount} líneas con errores de formato.`
            if (skippedCount > 0) errorMsg += `\n${skippedCount} códigos duplicados.`
            errorMsg += '\n\nRevise la consola del navegador para más detalles.'
            alert(errorMsg)
          }
          
          // Limpiar el input file
          event.target.value = ''
          
        } catch (error) {
          alert('❌ Error al importar el archivo CSV. Verifique el formato.\n\nRevise la consola del navegador para más detalles.')
          console.error('Error importando CSV:', error)
        }
      }
      
      reader.readAsText(file)
    }

    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100">
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border-b border-primary/10 sticky top-0 z-10">
          <h2 className="text-lg font-bold">Panel de Administrador</h2>
          <button
            onClick={() => { setView('login'); setUserData({ name: '', code: '' }); }}
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

          {/* Sección de Gestión de Equipos */}
          <section className="bg-white dark:bg-slate-900 rounded-xl p-6 mb-6 border border-slate-100 dark:border-slate-800">
            <div className="mb-4">
              <h3 className="text-2xl font-bold mb-2">Gestionar Equipos de Desarrollo</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Forma equipos balanceados de 4 integrantes (uno por cada categoría)
              </p>
            </div>
            
            <div className="flex gap-3 mb-4">
              <button
                onClick={generateTeams}
                disabled={allResponses.length < 4}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  allResponses.length < 4 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                🎯 Generar Equipos
              </button>
              
              {generatedTeams.length > 0 && (
                <button
                  onClick={deleteAllTeams}
                  className="px-6 py-3 rounded-lg font-semibold transition-colors bg-red-600 hover:bg-red-700 text-white"
                >
                  🗑️ Eliminar Todos
                </button>
              )}
            </div>

            {generatedTeams.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-bold mb-4">Equipos Generados ({generatedTeams.length})</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {generatedTeams.map((team) => {
                    const unassignedStudents = getUnassignedStudents()
                    
                    return (
                    <div 
                      key={team.id} 
                      className="border-2 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                    >
                      <div className="bg-primary text-white font-bold py-3 px-4 flex justify-between items-center">
                        <button
                          onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                          className="flex-1 text-left flex justify-between items-center hover:opacity-80 transition-opacity"
                        >
                          <span>{team.name} ({team.members.length} miembros)</span>
                          <span className="text-xl">{expandedTeam === team.id ? '▼' : '▶'}</span>
                        </button>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="ml-3 px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm transition-colors"
                          title="Eliminar equipo"
                        >
                          🗑️
                        </button>
                      </div>
                      
                      {expandedTeam === team.id && (
                        <div className="p-4 space-y-3">
                          {team.members.map((member, idx) => (
                            <div 
                              key={member.id} 
                              className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm text-primary">
                                  {categoriesInfo[member.topCategory]?.title || 'Sin categoría'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                                    {member.topCategory}
                                  </span>
                                  <button
                                    onClick={() => removeMemberFromTeam(team.id, member.id)}
                                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                                    title="Quitar del equipo"
                                  >
                                    ✖
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm mb-1">
                                <strong>Nombre:</strong> {member.name || 'N/A'}
                              </p>
                              <p className="text-sm mb-1">
                                <strong>Código:</strong> {member.code}
                              </p>
                              <p className="text-sm mb-2">
                                <strong>Rol:</strong> {member.rolEstudiante}
                              </p>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="font-bold">A</div>
                                  <div>{member.averages.A}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold">B</div>
                                  <div>{member.averages.B}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold">C</div>
                                  <div>{member.averages.C}</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold">D</div>
                                  <div>{member.averages.D}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Sección para añadir participantes */}
                          {unassignedStudents.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-600">
                              <label className="block text-sm font-semibold mb-2">
                                Añadir participante:
                              </label>
                              <div className="flex gap-2">
                                <select
                                  id={`add-member-${team.id}`}
                                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:border-primary focus:ring-0 outline-none"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Seleccionar estudiante...</option>
                                  {unassignedStudents.map(student => (
                                    <option key={student.id} value={student.id}>
                                      {student.name || student.code} - {categoriesInfo[student.topCategory]?.title} ({student.topCategory})
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const select = document.getElementById(`add-member-${team.id}`)
                                    const studentId = parseInt(select.value)
                                    if (studentId) {
                                      addMemberToTeam(team.id, studentId)
                                      select.value = ''
                                    }
                                  }}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                  ➕ Añadir
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-slate-500 text-sm mt-4">
              Los equipos se forman con un integrante de cada categoría: Clarificador (A), Ideador (B), Desarrollador (C) e Implementador (D).
            </p>
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
                <label className="px-4 py-2 rounded-lg font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                  📤 Importar CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={importCSV}
                    className="hidden"
                  />
                </label>
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
                        <th className="text-left py-3 px-4 font-bold text-primary">Nombre</th>
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
                          <td className="py-3 px-4">{response.name || 'N/A'}</td>
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
