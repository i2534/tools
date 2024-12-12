#!/bin/bash

# 尝试更新运行中的容器的镜像, 如果镜像有变化则 down/up 容器

# 检查是否运行在群晖系统上
is_dsm=false
if [ -f /etc.defaults/VERSION ]; then
    is_dsm=true
    echo "Running on Synology NAS"
    # 读取群晖系统版本信息
    syno_version=$(cat /etc.defaults/VERSION | grep 'productversion' | cut -d'=' -f2)
    echo "Synology version: $syno_version"
fi

# 获取当前正在运行的容器
running=$(docker ps --format '{{.Names}}')
if [ -z "$running" ]; then
    echo "No running containers found"
    exit 0
fi

# 遍历每个容器名称
for container in $running; do
    echo "Check $container..."
    info=$(docker inspect "$container" | jq -r '.[0]')
    work_dir=$(echo $info | jq -r '.Config.Labels."com.docker.compose.project.working_dir"')

    if [ -z "$work_dir" ]; then
        work_dir=$(echo $info | jq -r '.Config.WorkingDir')
    fi

    if [ -z "$work_dir" ]; then
        echo "No work_dir found" 
        continue
    fi

    image_id=$(echo $info | jq -r '.Image' | cut -c8-19)
    image_name=$(echo $info | jq -r '.Config.Image')
    image_repo=$(echo $image_name | cut -d':' -f1)
    image_tag=$(echo $image_name | cut -d':' -f2)

    echo "  $image_repo:$image_tag at $work_dir"

    cd "$work_dir" || continue

    if [ $is_dsm = true ]; then
        docker-compose --ansi never pull -q
        images=$(docker images --format '{"Repository":"{{.Repository}}","Tag":"{{.Tag}}","ID":"{{.ID}}","Size":"{{.Size}}","CreatedAt":"{{.CreatedAt}}"}')
    else
        docker compose --progress quiet pull
        images=$(docker images --format json)
    fi
    images=$(echo $images | jq -c --arg repo "$image_repo" 'select(.Repository == $repo)')

    newest_date=""
    current_date=""
    while IFS= read -r image; do
        id=$(echo "$image" | jq -r '.ID')
        created_at=$(echo "$image" | jq -r '.CreatedAt')
        if [ -z "$newest_date" ] || [[ "$created_at" > "$newest_date" ]]; then
            newest_date="$created_at"
        fi
        if [[ "$id" = "$image_id" ]]; then
            current_date="$created_at"
            continue
        fi
    done <<< "$images"


    if [[ "$newest_date" > "$current_date" ]]; then
        echo "  Update $container"
        echo "  $current_date -> $newest_date"
        if [ $is_dsm = true ]; then
            docker-compose down && docker-compose up -d
        else
            docker compose down && docker compose up -d
        fi
    else
        echo "  Current: $current_date"
        echo "  Newest: $newest_date"
        echo "  No update available"
    fi

done
