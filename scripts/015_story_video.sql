-- Stories com vídeo: tipo de mídia e duração (ms) para o viewer avançar certo.
alter table public.stories
  add column if not exists media_type text not null default 'image',
  add column if not exists duration_ms integer;

-- Normaliza registros antigos: se a URL termina em extensão de vídeo, marca como vídeo.
update public.stories
set media_type = 'video'
where media_type = 'image'
  and (media_url ilike '%.mp4' or media_url ilike '%.webm' or media_url ilike '%.mov');
