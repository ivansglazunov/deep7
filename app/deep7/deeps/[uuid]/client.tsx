"use client"

import { CytoNode as DeepLinkNode } from '@/components/entities/deep_links';
import { Cyto, CytoStyle } from "hasyx/lib/cyto";
import { Card as EntityCard, Button as EntityButton } from '@/lib/entities';
import { QueriesManager, QueriesRenderer } from 'hasyx/lib/renderer';
import { useCallback, useEffect, useMemo, useState } from "react";
import projectSchema from '@/public/hasura-schema.json';
import { useAll, useDeep } from '@/lib/react';
import { useSubscription } from 'hasyx';

// Styles for Cytoscape
const stylesheet = [
  {
    selector: 'node',
    style: {
      'background-color': 'var(--foreground)',
      'background-opacity': 0,
      'shape': 'circle',
      'width': 10,
      'height': 10,
      'border-radius': 10,
      'color': 'var(--foreground)',
    }
  },
  {
    selector: 'node.entity',
    style: {
      'background-opacity': 1,
      'shape': 'circle',
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'right',
      'text-margin-x': 10,
    }
  },
  {
    selector: 'node.entity.avatar',
    style: {
      'background-image': 'data(image)',
      'background-fit': 'cover cover',
      'background-opacity': 1,
      'width': 50,
      'height': 50,
      'shape': 'circle',
      'label': 'data(label)',
    }
  },
  {
    selector: 'node.entity.opened',
    style: {
      'background-opacity': 0,
      'shape': 'rectangle',
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': 'var(--foreground)',
      'target-arrow-color': 'var(--foreground)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier'
    }
  },
  {
    selector: 'edge.deep_links._type',
    style: {
      'width': 2,
      'line-color': 'var(--foreground)',
      'target-arrow-color': 'var(--foreground)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'line-dash-pattern': [6, 3],
    }
  },
];

export default function Client() {
  const [queries, setQueries] = useState<any[]>([]);
  const deep = useDeep();
  const all = useAll();

  const { data: unprotected } = useSubscription({
    table: 'deep_links',
    where: { _deep: { _eq: deep._id }, _protected: { _eq: false } },
    returning: ['id', '_i', '_deep', '_type', '_from', '_to', 'string', 'number', 'function', 'created_at', 'updated_at']
  });

  useEffect(() => {
    if (unprotected && deep.state.storage) {
      deep.state.storage.state.applyResults(unprotected);
    }
  }, [unprotected, deep]);

  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  const onGraphLoaded = useCallback((cy) => {
    if (global) (global as any).cy = cy;
    cy.zoom(1);
    cy.center();
  }, []);

  const layoutConfig = useMemo(() => ({
    // name: 'cola',
    // nodeDimensionsIncludeLabels: true,
    // fit: false
    name: 'd3-force',
    
    // === ОСНОВНЫЕ ПАРАМЕТРЫ АНИМАЦИИ ===
    animate: true, // Анимация: показывать ли макет во время выполнения. Значение 'end' заставляет макет анимироваться как дискретный
    // maxIterations: 0, // Максимальное количество итераций: предельное число итераций перед завершением работы макета
    // maxSimulationTime: 0, // Максимальное время симуляции: максимальная длительность в мс для выполнения макета
    // ungrabifyWhileSimulating: false, // Блокировка перетаскивания: запрещает перетаскивание узлов во время работы макета
    // fixedAfterDragging: false, // Фиксация после перетаскивания: фиксирует узел после его перетаскивания пользователем
    // fit: false, // Автоподгонка: при каждом изменении позиций узлов подгоняет область просмотра под график
    padding: 30, // Отступы: отступы вокруг симуляции в пикселях
    // boundingBox: undefined, // Ограничивающий прямоугольник: ограничивает границы макета; { x1, y1, x2, y2 } или { x1, y1, w, h }
    
    // === API ПАРАМЕТРЫ D3-FORCE ===
    
    // === КОНТРОЛЬ СИМУЛЯЦИИ ===
    // alpha: 1, // Альфа (текущая энергия): устанавливает текущее значение альфа в диапазоне [0,1] - контролирует "горячность" симуляции
    // alphaMin: 0.001, // Минимальная альфа: минимальное значение альфа [0,1] - когда симуляция считается завершенной
    // alphaDecay: 1 - Math.pow(0.001, 1 / 300), // Затухание альфы: скорость уменьшения альфы [0,1] - как быстро симуляция "остывает"
    // alphaTarget: 0, // Целевая альфа: целевое значение альфы [0,1] - к какому значению стремится альфа
    // velocityDecay: 0.4, // Затухание скорости: коэффициент затухания скорости [0,1] - имитирует трение, замедляя узлы
    
    // === СИЛА СТОЛКНОВЕНИЙ (предотвращение наложения узлов) ===
    // collideRadius: 1, // Радиус столкновения: задает радиус для каждого узла для предотвращения наложений
    // collideStrength: 0.7, // Сила столкновения: сила отталкивания при столкновениях [0,1] - насколько сильно узлы отталкиваются
    // collideIterations: 1, // Итерации столкновений: количество итераций для расчета столкновений - больше = точнее, но медленнее
    
    // === СИЛА СВЯЗЕЙ (соединения между узлами) ===
    linkId: function id(d) {
      return d.id; // Идентификатор связи: функция для получения ID узла из данных
    },
    linkDistance: 100, // Расстояние связи: желаемое расстояние между соединенными узлами в пикселях
    linkStrength: function strength(edge) {
      if (edge._ === '_type') return 0.4;
      return 0; // Сила связи: насколько сильно связь притягивает узлы друг к другу
      // return 1 / Math.min(count(link.source), count(link.target)); // Сила связи: насколько сильно связь притягивает узлы друг к другу
    },
    // linkIterations: 1, // Итерации связей: количество итераций для расчета сил связей - больше = стабильнее, но медленнее
    
    // === МНОГОЧАСТИЧНАЯ СИЛА (отталкивание между всеми узлами) ===
    manyBodyStrength: -130, // Сила многих тел: сила отталкивания между узлами (отрицательная = отталкивание, положительная = притяжение)
    // manyBodyTheta: 0.9, // Тета Барнса-Хата: критерий аппроксимации Барнса-Хата [0,1] - 0 = точно, 1 = быстро но неточно
    // manyBodyDistanceMin: 1, // Минимальное расстояние: минимальное расстояние между узлами для учета силы - предотвращает деление на ноль
    // manyBodyDistanceMax: Infinity, // Максимальное расстояние: максимальное расстояние для учета силы - ограничивает дальнодействие
    
    // === ПОЗИЦИОНИРУЮЩИЕ СИЛЫ (притяжение к определенным координатам) ===
    // xStrength: 0.1, // Сила X: сила притяжения узлов к определенной X-координате [0,1]
    // xX: 0, // Координата X: целевая X-координата для притяжения узлов
    // yStrength: 0.1, // Сила Y: сила притяжения узлов к определенной Y-координате [0,1]
    // yY: 0, // Координата Y: целевая Y-координата для притяжения узлов
    
    // === РАДИАЛЬНЫЕ СИЛЫ (притяжение к окружности) ===
    // radialStrength: 0.1, // Радиальная сила: сила притяжения узлов к окружности [0,1]
    // radialRadius: [radius], // Радиальный радиус: радиус окружности для притяжения узлов
    // radialX: 0, // Радиальный центр X: X-координата центра окружности
    // radialY: 0, // Радиальный центр Y: Y-координата центра окружности
    
    // === ОБРАТНЫЕ ВЫЗОВЫ СОБЫТИЙ МАКЕТА ===
    // ready: function(){}, // Готовность: вызывается когда макет готов к работе
    // stop: function(){}, // Остановка: вызывается когда макет завершает работу
    // tick: function(progress) {}, // Тик: вызывается на каждой итерации с прогрессом выполнения
    
    // === ОПЦИИ ПОЗИЦИОНИРОВАНИЯ ===
    // randomize: false, // Рандомизация: использовать ли случайные позиции узлов в начале макета
    
    // === ОПЦИИ БЕСКОНЕЧНОГО МАКЕТА ===
    // infinite: false // Бесконечный режим: переопределяет все другие опции для постоянного режима сил
  }), []);

  const closeModal = useCallback(() => setSelectedEntity(null), []);

  return (
    <div className="w-full h-full relative">
      <Cyto
        onLoaded={onGraphLoaded}
        buttons={true}
        layout={layoutConfig}
        leftTop={<QueriesManager queries={queries} setQueries={setQueries} schema={projectSchema} />}
      >
        <CytoStyle stylesheet={stylesheet} />
        <QueriesRenderer
          queries={queries}
          schema={projectSchema}
          onClick={setSelectedEntity}
          EntityButtonComponent={EntityButton}
        />
        {all.map(d => <DeepLinkNode key={d.id} data={{ id: d.id, deep: d.deep }}/>)}
      </Cyto>

      {/* Modal for entity details */}
      {selectedEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div className='w-1/3' onClick={e => e.stopPropagation()}>
            <EntityCard
              data={selectedEntity}
              onClose={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
} 