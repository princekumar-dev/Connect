import { useState } from 'react'

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const faqs = [
    {
      category: "Booking",
      icon: "📅",
      color: "blue",
      questions: [
        {
          q: "How do I book a venue?",
          a: "Navigate to the 'Book' page, select your desired venue, date, and time. Fill in the event details and submit. Your booking will be pending until approved by an administrator."
        },
        {
          q: "How far in advance should I book?",
          a: "Bookings should be made at least 24 hours in advance. For major events, we recommend booking 1-2 weeks ahead to ensure availability."
        },
        {
          q: "Can I modify my booking after submission?",
          a: "Once submitted, you cannot directly edit a booking. You'll need to cancel and create a new booking, or contact an administrator for assistance."
        },
        {
          q: "What happens if there's a booking conflict?",
          a: "The system alerts you when a slot conflicts with an existing booking or its cooldown period. Secretary bookings have highest priority, followed by Principal, then Admin, then Staff and other regular bookings."
        }
      ]
    },
    {
      category: "Venues",
      icon: "🏛️",
      color: "green",
      questions: [
        {
          q: "What venues are available?",
          a: "We have four venues: KRS Seminar Hall (200 capacity), Civil Seminar Hall (150 capacity), ECE Seminar Hall (150 capacity), and MS Auditorium (500 capacity)."
        },
        {
          q: "What facilities do the venues have?",
          a: "All venues have audio systems and projectors. MS Auditorium and KRS Hall have stages. Each venue has specific features listed on the Venues page."
        },
        {
          q: "How do I check real-time venue availability?",
          a: "Visit the Venues page to see real-time status: Available (green), In Use (red), or Buffer Time (orange). The page auto-refreshes every 30 seconds."
        },
        {
          q: "What is buffer time?",
          a: "Buffer time is the cooldown period after each event. Every venue now has a 30-minute cooldown before the next booking can start."
        }
      ]
    },
    {
      category: "Approval Process",
      icon: "✅",
      color: "purple",
      questions: [
        {
          q: "Who approves bookings?",
          a: "All bookings are reviewed and approved by system administrators. You'll receive an email notification once your booking is approved or rejected."
        },
        {
          q: "How long does approval take?",
          a: "Most bookings are reviewed within 24 hours. For urgent requests, contact the administration directly."
        },
        {
          q: "What is the priority system?",
          a: "The booking priority order is Secretary first, Principal next, Admin next, then Staff and other regular bookings. When a higher-priority booking conflicts with a lower-priority one, the system tries to move the lower-priority booking to a suitable available venue automatically."
        },
        {
          q: "Can my approved booking be cancelled?",
          a: "Yes, administrators may cancel or reassign bookings for maintenance, emergencies, or higher-priority college events. You'll be notified immediately."
        }
      ]
    },
    {
      category: "Events",
      icon: "🎉",
      color: "orange",
      questions: [
        {
          q: "Can I view all upcoming events?",
          a: "Yes! Visit the Events page to see all upcoming events. You can filter by event type (Workshop, Seminar, Cultural, etc.) and search by keywords."
        },
        {
          q: "What event types are supported?",
          a: "We support Workshops, Seminars, Conferences, Meetings, Competitions, Cultural Events, Sports Events, and Alumni Talks."
        },
        {
          q: "Can I add images to my event?",
          a: "Yes, when creating a booking, you can add an event image URL. Default images are assigned based on event type if none is provided."
        }
      ]
    },
    {
      category: "Account & Access",
      icon: "👤",
      color: "indigo",
      questions: [
        {
          q: "Who can use MSEC Connect?",
          a: "All MSEC students, faculty, and staff with valid college email addresses can register and use the platform."
        },
        {
          q: "How do I get admin access?",
          a: "Admin roles are assigned by the system administrator. Contact your department head or IT support for role changes."
        },
        {
          q: "Can I view my booking history?",
          a: "Yes! Go to 'My Bookings' to see all your past, current, and pending bookings with their status."
        },
        {
          q: "What if I forgot my password?",
          a: "Use the 'Forgot Password' link on the login page to reset your password via email."
        }
      ]
    },
    {
      category: "Technical Issues",
      icon: "🔧",
      color: "red",
      questions: [
        {
          q: "The website is not loading properly. What should I do?",
          a: "Try clearing your browser cache (Ctrl+F5 or Cmd+Shift+R) or try a different browser. If issues persist, contact support."
        },
        {
          q: "I'm not receiving email notifications.",
          a: "Check your spam/junk folder. Add support@msecconnect.edu to your contacts. Verify your email address in your profile."
        },
        {
          q: "Can I use MSEC Connect on mobile?",
          a: "Yes! The platform is fully responsive and works on all devices - phones, tablets, and desktops."
        },
        {
          q: "Who do I contact for technical support?",
          a: "Email support@msecconnect.edu or visit the Contact page for more options."
        }
      ]
    }
  ]

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'from-blue-600 to-blue-700',
        hover: 'hover:from-blue-700 hover:to-blue-800',
        border: 'border-blue-500',
        bgLight: 'bg-blue-50'
      },
      green: {
        bg: 'from-green-600 to-green-700',
        hover: 'hover:from-green-700 hover:to-green-800',
        border: 'border-green-500',
        bgLight: 'bg-green-50'
      },
      purple: {
        bg: 'from-purple-600 to-purple-700',
        hover: 'hover:from-purple-700 hover:to-purple-800',
        border: 'border-purple-500',
        bgLight: 'bg-purple-50'
      },
      orange: {
        bg: 'from-orange-600 to-orange-700',
        hover: 'hover:from-orange-700 hover:to-orange-800',
        border: 'border-orange-500',
        bgLight: 'bg-orange-50'
      },
      indigo: {
        bg: 'from-indigo-600 to-indigo-700',
        hover: 'hover:from-indigo-700 hover:to-indigo-800',
        border: 'border-indigo-500',
        bgLight: 'bg-indigo-50'
      },
      red: {
        bg: 'from-red-600 to-red-700',
        hover: 'hover:from-red-700 hover:to-red-800',
        border: 'border-red-500',
        bgLight: 'bg-red-50'
      }
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 smooth-scroll mobile-smoothest-scroll no-mobile-anim">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Find answers to common questions about MSEC Connect. Can't find what you're looking for? Contact our support team.
            </p>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-8">
            {faqs.map((category, catIndex) => {
              const colorClasses = getColorClasses(category.color)

              return (
                <div key={catIndex} className="glass-card no-mobile-backdrop overflow-hidden rounded-3xl shadow-2xl hover:scale-[1.02] transition-all duration-300">
                  {/* Category Header */}
                  <div className={`bg-gradient-to-r ${colorClasses.bg} px-6 py-6`}>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-4">
                      <span className="text-3xl">{category.icon}</span>
                      {category.category}
                    </h2>
                  </div>

                  {/* Questions */}
                  <div className="divide-y divide-gray-200">
                    {category.questions.map((faq, qIndex) => {
                      const uniqueIndex = `${catIndex}-${qIndex}`
                      const isOpen = openIndex === uniqueIndex

                      return (
                        <div key={qIndex} className="transition-all duration-200">
                          <button
                            onClick={() => toggleFAQ(uniqueIndex)}
                            className={`w-full px-6 py-5 text-left ${colorClasses.bgLight} hover:opacity-80 transition-all flex justify-between items-start gap-4`}
                          >
                            <span className="text-base font-semibold text-gray-900 flex-1">
                              {faq.q}
                            </span>
                            <span className={`text-${category.color}-600 text-2xl flex-shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
                              +
                            </span>
                          </button>
                          
                          {isOpen && (
                            <div className={`px-6 pb-6 pt-2 bg-gradient-to-r ${colorClasses.bgLight} animate-fadeIn`}>
                              <div className={`bg-white rounded-2xl p-6 border-l-4 ${colorClasses.border} shadow-sm`}>
                                <p className="text-base text-gray-600 leading-relaxed">
                                  {faq.a}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
              </div>
            )
          })}
        </div>

        {/* Contact Support */}
  <div className="glass-card no-mobile-backdrop mt-8 sm:mt-12 p-6 sm:p-8 text-center">
          <div className="inline-block p-3 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold mb-3 text-gray-800">Still have questions?</h3>
          <p className="text-sm sm:text-base mb-6 text-gray-600 max-w-xl mx-auto">
            Our support team is here to help you with any queries or concerns.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="mailto:support@msecconnect.edu?subject=MSEC Connect Support Request&body=Hello MSEC Connect Team,%0D%0A%0D%0APlease describe your issue or question here:%0D%0A%0D%0A"
              className="glass-button inline-flex items-center gap-2 px-6 py-3 text-blue-600 rounded-xl font-semibold transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Support
            </a>
            <button
              onClick={() => window.location.href = '/contact'}
              className="glass-button inline-flex items-center gap-2 px-6 py-3 text-blue-600 rounded-xl font-semibold transition-colors text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contact Us
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 sm:mt-12">
          <button
            onClick={() => window.history.back()}
            className="glass-button group font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-xl transition-all duration-300 flex items-center gap-2 text-sm sm:text-base text-blue-600"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to previous page
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FAQ
