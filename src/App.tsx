import React, { useCallback, useEffect, useRef, useState } from 'react'
import remarkParse from 'remark-parse'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import rehypeMathJax from 'rehype-mathjax/svg'
import rehypeKaTeX from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { serverUrl, data, testAnswer } from './sources'
import KatexComp from './KatexComp'

export interface DataType {
  requestID: string
  end: boolean
  messages: Message[]
}

export interface Message {
  role: string
  content: string
  imageUrl?: string[]
}

function divideMathFromText(text: string) {
  const pattern = /\\\[(.*?)\\\]|\\\((.*?)\\\)|\$(.*?)\$|\$\$(.*?)\$\$/gs
  text = text.replace(/₩/g, '\\')
  let lastIndex = 0
  const parts = []
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    let value = ''
    if (match[1]) {
      // \\[ ... \\] -> $ ... $
      value = `$${match[1]}$`
    } else if (match[2]) {
      // \\( ... \\) -> $ ... $
      value = `$${match[2]}$`
    } else if (match[3]) {
      // $ ... $ -> $ ... $
      value = `$${match[3]}$`
    } else if (match[4]) {
      // $$ ... $$ -> $ ... $
      value = `$${match[4]}$`
    }
    parts.push({ type: 'Math', value })
    console.log('parts', parts)
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) {
    const lastText = text.slice(lastIndex)
    const incompletePattern = /(\$\$|\$|\\\(|\\\[)(?:(?!\$|\\\)|\\\]).)*$/m
    const incompleteMatch = incompletePattern.exec(lastText)
    if (incompleteMatch) {
      const waitingPart = lastText.slice(0, incompleteMatch.index) + '(...)'
      parts.push({
        type: 'Waiting',
        value: waitingPart,
      })
    } else {
      parts.push({ type: 'text', value: lastText })
    }
  }
  return parts
}
export default function App() {
  const [answer, setAnswer] = useState('')
  const [rendererType, set_rendererType] = useState<'MathJax' | 'KaTeX'>(
    'MathJax'
  )
  const [clientMessage, set_clientMessage] = useState<string>('')
  const [response, set_response] = useState<DataType | null>(null)
  const currentText = useRef('')
  const [currentSocket, set_currentSocket] = useState<WebSocket | null>(null)
  const getWithSocket = useCallback((socket: WebSocket) => {
    set_clientMessage(`답변 대기중 ...`)
    socket.send(JSON.stringify(data))
  }, [])
  useEffect(() => {
    const socket = new WebSocket(serverUrl)
    socket.onopen = function (event) {
      set_clientMessage(`소켓 연결됨`)
    }
    socket.onclose = function (event) {
      set_clientMessage(`소켓 닫힘`)
    }
    socket.onmessage = function (event) {
      set_clientMessage('')
      const messageData = JSON.parse(event.data)
      if (typeof messageData.value === 'string') {
        const data = messageData.value
        currentText.current += data
        const parts = divideMathFromText(currentText.current)
        setAnswer(parts.map((part) => part.value).join(''))
      }
      if (messageData.end) {
        set_response(messageData)
      }
    }
    set_currentSocket(socket)
    return () => {
      socket.close()
      set_currentSocket(null)
      set_response(null)
    }
  }, [])
  function getAnswer() {
    currentText.current = testAnswer
    const parts = divideMathFromText(testAnswer)
    setAnswer(parts.map((part) => part.value).join(''))
  }
  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight)
  }, [response, answer])
  return (
    <div className="math-wrap w-full whitespace-pre-line">
      <div
        className={`prose prose-sm prose-slate w-full 
      max-w-full md:prose-base lg:prose-lg whitespace-pre-line`}
      >
        <div className="flex gap-4 items-center sticky top-0 bg-white shadow-sm shadow-gray-200 p-2">
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={getAnswer}
          >
            로컬 테스트
          </button>
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              if (!currentSocket) return
              currentText.current = ''
              set_clientMessage(`연결 시작 ...`)
              getWithSocket(currentSocket)
            }}
          >
            시작
          </button>
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              if (!currentSocket) return
              currentSocket.close()
            }}
          >
            종료
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              console.log('currentText', currentText.current)
            }}
          >
            원본 출력(console)
          </button>

          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              console.log('allParts', answer)
            }}
          >
            파싱 출력(console)
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              set_rendererType(rendererType === 'MathJax' ? 'KaTeX' : 'MathJax')
            }}
          >
            타입 변경
          </button>
          <div>{`(렌더링 타입: ${rendererType}) ${clientMessage}`}</div>
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkParse, remarkMath]}
          rehypePlugins={[
            remarkRehype,
            rendererType === 'KaTeX' ? rehypeKaTeX : rehypeMathJax,
            rehypeStringify,
          ]}
          components={{
            text: ({ node, children, ...props }) => {
              return (
                <text {...props}>
                  <span>{children}</span>
                </text>
              )
            },
            p: ({ node, children, ...props }) => {
              return <p {...props}>{children}</p>
            },
          }}
        >
          {answer}
        </ReactMarkdown>
      </div>
    </div>
  )
}
