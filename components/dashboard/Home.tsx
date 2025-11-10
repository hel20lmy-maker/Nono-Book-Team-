
import React, { useState } from 'react';
import { PlusCircleIcon, SparkIcon, SendIcon, CloudUploadIcon, DottedCircleIcon } from '../ui/Icons';
import CreateOrderModal from '../workflow/CreateOrderModal';

const Home: React.FC = () => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Home</h1>
        <a href="#" className="text-blue-600 hover:underline text-sm font-medium">
          Try the new experience
        </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
        <textarea
          className="w-full border-none focus:ring-0 resize-none p-2 placeholder-gray-400"
          rows={3}
          placeholder="Ask anything"
          aria-label="Ask anything"
        ></textarea>
        <div className="flex justify-between items-center mt-2 px-2 pb-1">
          <button className="text-gray-500 hover:text-gray-800" aria-label="Add content">
            <PlusCircleIcon className="w-6 h-6" />
          </button>
          <button className="text-gray-500 hover:text-gray-800" aria-label="Send">
            <SendIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-1.5 px-4 rounded-full hover:bg-gray-50 text-sm">
          <CloudUploadIcon className="w-5 h-5" />
          Task
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">New</span>
        </button>
        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-1.5 px-4 rounded-full hover:bg-gray-50 text-sm">
          <DottedCircleIcon className="w-5 h-5" />
          Create issue
        </button>
        <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-1.5 px-4 rounded-full hover:bg-gray-50 text-sm">
          <SparkIcon className="w-5 h-5" />
          Spark
        </button>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Top Repositories</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-center">Create your first project</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto text-center text-sm">
                Ready to start building? Create a repository for a new idea or bring over an existing repository to keep contributing to it.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
                <button 
                    onClick={() => setCreateModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md w-full sm:w-auto"
                >
                    Create repository
                </button>
                <button className="bg-transparent hover:bg-gray-100 text-blue-600 font-bold py-2 px-4 rounded-md border border-gray-300 w-full sm:w-auto">
                    Import repository
                </button>
            </div>
        </div>
      </div>
        
      <div className="mt-8 bg-gray-900 text-white p-4 rounded-lg flex justify-between items-center relative overflow-hidden">
          <div className="flex items-center">
                <img src="https://i.imgur.com/WpYf2ED.png" alt="GitHub for Beginners course" className="w-20 h-20 object-cover rounded-md mr-4"/>
                <div>
                    <h4 className="font-bold">GitHub for Beginners</h4>
                    <p className="text-sm text-gray-300">Start your journey with GitHub today.</p>
                </div>
          </div>
          <button className="text-gray-400 hover:text-white absolute top-2 right-2" aria-label="Close ad">&times;</button>
      </div>

      {isCreateModalOpen && (
        <CreateOrderModal onClose={() => setCreateModalOpen(false)} />
      )}
    </div>
  );
};

export default Home;
