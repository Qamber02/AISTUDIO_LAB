import React, { useState, useEffect } from 'react';
import type { Dataset, Model } from './types';
import { api } from './api';
import { HeaderNav } from './components/HeaderNav';
import { TabNavigation } from './components/TabNavigation';
import { OverviewStudio } from './components/OverviewStudio';
import { DatasetStudio } from './components/DatasetStudio';
import { ModelStudio } from './components/ModelStudio';
import { TrainingLab } from './components/TrainingLab';
import { VisualizerStudio } from './components/VisualizerStudio';
import { ModelPlayground } from './components/ModelPlayground';
import { ExperimentsStudio } from './components/ExperimentsStudio';
import { SettingsStudio } from './components/SettingsStudio';
import { SocietyStudio } from './components/SocietyStudio';

export const App: React.FC = () => {
  const [currentStudio, setCurrentStudio] = useState<string>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Global Data State
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [activeModel, setActiveModel] = useState<Model | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isQuickStarting, setIsQuickStarting] = useState(false);

  // Sync theme attribute to <html> tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      const [dsList, mList] = await Promise.all([
        api.getDatasets(),
        api.getModels(),
      ]);
      setDatasets(dsList);
      setModels(mList);

      if (dsList.length > 0 && !selectedDataset) {
        setSelectedDataset(dsList[0]);
      }
      if (mList.length > 0 && !activeModel) {
        setActiveModel(mList[0]);
      }
    } catch (err) {
      console.error('Failed to load initial lab data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshDatasets = async () => {
    try {
      const dsList = await api.getDatasets();
      setDatasets(dsList);
      if (dsList.length > 0 && (!selectedDataset || !dsList.some((d) => d.id === selectedDataset.id))) {
        setSelectedDataset(dsList[0]);
      }
    } catch (err) {
      console.error('Failed to refresh datasets', err);
    }
  };

  const refreshModels = async () => {
    try {
      const mList = await api.getModels();
      setModels(mList);
      if (activeModel) {
        const updated = mList.find((m) => m.id === activeModel.id);
        if (updated) setActiveModel(updated);
      }
    } catch (err) {
      console.error('Failed to refresh models', err);
    }
  };

  // Quick Start Handlers
  const handleQuickStart = async (templateKey: string) => {
    if (models.length >= 10) return;
    setIsQuickStarting(true);
    try {
      let ds = datasets[0];

      if (templateKey === 'moons_nn') {
        ds = datasets.find((d) => d.name.toLowerCase().includes('moons')) || datasets[0];
        const newModel = await api.createModel({
          name: 'Quick Neural Moons',
          description: '2-Layer Inspectable Neural Network on Moons dataset',
          model_type: 'neural_network',
          task_type: 'classification',
          dataset_id: ds.id,
          hyperparameters: {
            hidden_layers: [12, 6],
            activation: 'relu',
            optimizer: 'adam',
            learning_rate: 0.02,
          },
          training_params: {
            epochs: 100,
            batch_size: 32,
            learning_rate: 0.02,
            test_split: 0.2,
            val_split: 0.15,
            scaler_type: 'standard',
          },
        });
        await refreshModels();
        setActiveModel(newModel);
        setCurrentStudio('training');
      } else if (templateKey === 'linear_sgd') {
        ds = datasets.find((d) => d.task_type === 'regression') || datasets[0];
        const newModel = await api.createModel({
          name: 'Quick SGD Regressor',
          description: 'Iterative SGD Linear Regression with live epoch loss',
          model_type: 'linear_regression',
          task_type: 'regression',
          dataset_id: ds.id,
          hyperparameters: {
            solver_mode: 'iterative',
            reg_type: 'ridge',
            alpha: 0.01,
            learning_rate: 0.01,
          },
          training_params: {
            epochs: 80,
            learning_rate: 0.01,
            test_split: 0.2,
            val_split: 0.15,
            scaler_type: 'standard',
          },
        });
        await refreshModels();
        setActiveModel(newModel);
        setCurrentStudio('training');
      } else if (templateKey === 'random_forest_blobs') {
        ds = datasets.find((d) => d.name.toLowerCase().includes('blobs')) || datasets[0];
        const newModel = await api.createModel({
          name: 'Quick Random Forest',
          description: 'warm_start iterative Random Forest tree growth',
          model_type: 'random_forest',
          task_type: 'classification',
          dataset_id: ds.id,
          hyperparameters: {
            n_estimators: 30,
            max_depth: 5,
            criterion: 'gini',
          },
          training_params: {
            test_split: 0.2,
            val_split: 0.15,
            scaler_type: 'standard',
          },
        });
        await refreshModels();
        setActiveModel(newModel);
        setCurrentStudio('training');
      }
    } catch (e) {
      console.error('Quick start failed', e);
    } finally {
      setIsQuickStarting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Sticky Top Header Navigation with 5-Step Guided Bar */}
      <HeaderNav
        currentStudio={currentStudio}
        onSelectStudio={setCurrentStudio}
        activeModel={activeModel}
        theme={theme}
        onToggleTheme={toggleTheme}
        modelCount={models.length}
      />

      {/* 8 Studio Workspaces Tabs */}
      <TabNavigation
        currentStudio={currentStudio}
        onSelectStudio={setCurrentStudio}
        datasetCount={datasets.length}
        modelCount={models.length}
        experimentCount={models.filter((m) => m.status === 'trained').length}
      />

      {/* Main Studio Viewport */}
      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {currentStudio === 'overview' && (
          <OverviewStudio
            datasets={datasets}
            models={models}
            onSelectStudio={setCurrentStudio}
            onQuickStart={handleQuickStart}
            isQuickStarting={isQuickStarting}
          />
        )}

        {currentStudio === 'dataset' && (
          <DatasetStudio
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onRefreshDatasets={refreshDatasets}
          />
        )}

        {currentStudio === 'model' && (
          <ModelStudio
            models={models}
            datasets={datasets}
            activeModel={activeModel}
            onSelectModel={setActiveModel}
            onSelectStudio={setCurrentStudio}
            onRefreshModels={refreshModels}
          />
        )}

        {currentStudio === 'training' && (
          <TrainingLab
            activeModel={activeModel}
            models={models}
            datasets={datasets}
            onSelectModel={setActiveModel}
            onSelectStudio={setCurrentStudio}
            onRefreshModels={refreshModels}
          />
        )}

        {currentStudio === 'visualizer' && (
          <VisualizerStudio
            activeModel={activeModel}
            datasets={datasets}
            onSelectStudio={setCurrentStudio}
          />
        )}

        {currentStudio === 'playground' && (
          <ModelPlayground
            activeModel={activeModel}
            datasets={datasets}
            onSelectStudio={setCurrentStudio}
          />
        )}

        {currentStudio === 'society' && (
          <SocietyStudio />
        )}

        {currentStudio === 'experiments' && (
          <ExperimentsStudio
            onSelectStudio={setCurrentStudio}
          />
        )}

        {currentStudio === 'settings' && (
          <SettingsStudio
            onRefreshAll={() => {
              refreshDatasets();
              refreshModels();
            }}
          />
        )}
      </main>

    </div>
  );
};

export default App;
